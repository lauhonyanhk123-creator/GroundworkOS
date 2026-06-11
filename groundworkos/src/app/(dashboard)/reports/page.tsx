'use client';

import { useState, useEffect, useRef } from 'react';
import { Panel } from '@/components/ui/panel';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, FileText, TrendingUp } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface RevenueData {
  month: string;
  total: number;
  invoice_count: number;
}

interface PipelineData {
  status: string;
  label: string;
  count: number;
  value: number;
}

interface AgedDebtorRow {
  id: string;
  invoice_number: string;
  client_name: string;
  total_amount: number;
  due_date: string | null;
  days_overdue: number;
}

interface AgedBucket {
  label: string;
  rows: AgedDebtorRow[];
  total: number;
}

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [pipelineData, setPipelineData] = useState<PipelineData[]>([]);
  const [agedBuckets, setAgedBuckets] = useState<AgedBucket[]>([]);
  const [agedGrandTotal, setAgedGrandTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const supabase = useRef(createClient());

  async function loadReports() {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [
        { data: invoices, error: invError },
        { data: jobs, error: jobsError },
        { data: outstandingInvoices, error: outstandingError },
      ] = await Promise.all([
        supabase.current
          .from('invoices')
          .select('total_amount, paid_at')
          .eq('status', 'paid')
          .gte('paid_at', sixMonthsAgo.toISOString()),
        supabase.current
          .from('jobs')
          .select('status, value'),
        supabase.current
          .from('invoices')
          .select('id, invoice_number, total_amount, due_date, status, clients:client_id(company_name)')
          .in('status', ['sent', 'overdue'])
          .order('due_date', { ascending: true }),
      ]);
      if (invError) throw invError;
      if (jobsError) throw jobsError;
      if (outstandingError) throw outstandingError;

      // Revenue data
      const monthMap = new Map<string, { total: number; count: number }>();
      for (const inv of invoices ?? []) {
        if (!inv.paid_at) continue;
        const d = new Date(inv.paid_at);
        const key = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
        const existing = monthMap.get(key) ?? { total: 0, count: 0 };
        monthMap.set(key, { total: existing.total + (inv.total_amount ?? 0), count: existing.count + 1 });
      }

      const last6Months: RevenueData[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
        const shortKey = d.toLocaleDateString('en-GB', { month: 'short' });
        const entry = monthMap.get(key) ?? { total: 0, count: 0 };
        last6Months.push({ month: shortKey, total: entry.total, invoice_count: entry.count });
      }
      setRevenueData(last6Months);

      // Pipeline data
      const pipelineMap: Record<string, { count: number; value: number; label: string }> = {
        active: { count: 0, value: 0, label: 'Active' },
        quoted: { count: 0, value: 0, label: 'Quoted' },
        complete: { count: 0, value: 0, label: 'Complete' },
      };
      for (const job of jobs ?? []) {
        if (job.status in pipelineMap) {
          pipelineMap[job.status].count += 1;
          pipelineMap[job.status].value += job.value ?? 0;
        }
      }
      setPipelineData(
        Object.entries(pipelineMap).map(([status, d]) => ({ status, ...d }))
      );

      // Aged debtors
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const buckets: AgedBucket[] = [
        { label: 'Current (not yet due)', rows: [], total: 0 },
        { label: '1–30 days overdue', rows: [], total: 0 },
        { label: '31–60 days overdue', rows: [], total: 0 },
        { label: '61–90 days overdue', rows: [], total: 0 },
        { label: '90+ days overdue', rows: [], total: 0 },
      ];

      let grandTotal = 0;

      for (const inv of outstandingInvoices ?? []) {
        const clientData = (inv.clients as unknown) as { company_name: string } | null;
        let daysOverdue = 0;
        if (inv.due_date) {
          const due = new Date(inv.due_date);
          due.setHours(0, 0, 0, 0);
          daysOverdue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        }

        const row: AgedDebtorRow = {
          id: inv.id,
          invoice_number: inv.invoice_number,
          client_name: clientData?.company_name ?? 'Unknown',
          total_amount: inv.total_amount ?? 0,
          due_date: inv.due_date,
          days_overdue: daysOverdue,
        };

        let bucketIndex: number;
        if (daysOverdue <= 0) bucketIndex = 0;
        else if (daysOverdue <= 30) bucketIndex = 1;
        else if (daysOverdue <= 60) bucketIndex = 2;
        else if (daysOverdue <= 90) bucketIndex = 3;
        else bucketIndex = 4;

        buckets[bucketIndex].rows.push(row);
        buckets[bucketIndex].total += row.total_amount;
        grandTotal += row.total_amount;
      }

      setAgedBuckets(buckets);
      setAgedGrandTotal(grandTotal);
    } catch (err) {
      console.error('[Reports]', err);
      setError('Failed to load reports. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadReports(); }, []);

  const totalRevenue = revenueData.reduce((sum, d) => sum + d.total, 0);
  const avgMonthly = revenueData.length > 0 ? totalRevenue / revenueData.length : 0;
  const totalJobs = pipelineData.reduce((sum, d) => sum + d.count, 0);
  const totalPipelineValue = pipelineData.reduce((sum, d) => sum + d.value, 0);
  const maxRevenue = Math.max(...revenueData.map(d => d.total), 1);
  const totalInvoices = revenueData.reduce((sum, d) => sum + d.invoice_count, 0);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-danger mb-2">{error}</p>
          <button
            onClick={() => { setError(null); setIsLoading(true); loadReports(); }}
            className="text-sm text-muted hover:text-text underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-condensed font-bold">Reports</h1>
          <p className="text-muted text-sm mt-1">Business insights and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/reports/rate-book"
            className="px-4 py-2 text-sm font-mono border border-border text-muted hover:text-text hover:border-yellow transition-colors"
          >
            Rate Book
          </Link>
          <Link
            href="/reports/cis"
            className="px-4 py-2 text-sm font-mono border border-border text-muted hover:text-text hover:border-yellow transition-colors"
          >
            CIS Return
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded" />)
        ) : (
          <>
            <StatCard label="Revenue (6 months)" value={formatCurrency(totalRevenue)} barPercent={80} />
            <StatCard label="Average Monthly" value={formatCurrency(avgMonthly)} barPercent={60} />
            <StatCard label="Total Jobs" value={totalJobs} barPercent={40} />
            <StatCard label="Pipeline Value" value={formatCurrency(totalPipelineValue)} barPercent={70} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Revenue (Last 6 Months)">
          {isLoading ? (
            <Skeleton className="h-64 rounded" />
          ) : (
            <div className="space-y-4">
              <div className="flex items-end justify-between gap-4 h-64">
                {revenueData.map((data, index) => {
                  const heightPercent = (data.total / maxRevenue) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex flex-col items-center">
                        <div className="text-xs font-mono text-muted mb-1">{formatCurrency(data.total)}</div>
                        <div className="w-full bg-surface-2 rounded-t relative" style={{ height: '200px' }}>
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-yellow rounded-t transition-all duration-500"
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-xs font-mono text-muted">{data.month}</div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Total Invoices</span>
                  <span className="font-mono">{totalInvoices}</span>
                </div>
                {totalInvoices > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Average per Invoice</span>
                    <span className="font-mono">{formatCurrency(totalRevenue / totalInvoices)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Pipeline Summary">
          {isLoading ? (
            <Skeleton className="h-64 rounded" />
          ) : (
            <div className="space-y-4">
              {pipelineData.map((data, index) => (
                <div key={index} className="p-4 bg-surface-2 rounded">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {data.status === 'active' && <Briefcase className="w-5 h-5 text-yellow" />}
                      {data.status === 'quoted' && <FileText className="w-5 h-5 text-yellow" />}
                      {data.status === 'complete' && <TrendingUp className="w-5 h-5 text-success" />}
                      <div>
                        <div className="font-medium">{data.label} Jobs</div>
                        <div className="text-xs text-muted">{data.count} jobs</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-condensed font-bold">{formatCurrency(data.value)}</div>
                    </div>
                  </div>
                  {totalPipelineValue > 0 && (
                    <div className="w-full bg-surface-3 rounded-full h-2 overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all duration-500',
                          data.status === 'active' && 'bg-yellow',
                          data.status === 'quoted' && 'bg-warning',
                          data.status === 'complete' && 'bg-success'
                        )}
                        style={{ width: `${(data.value / totalPipelineValue) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
              <div className="border-t border-border pt-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-muted">Total Pipeline</span>
                  <span className="text-2xl font-condensed font-bold text-yellow">
                    {formatCurrency(totalPipelineValue)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* Aged Debtors Section */}
      <Panel title="Aged Debtors">
        {isLoading ? (
          <Skeleton className="h-64 rounded" />
        ) : agedGrandTotal === 0 ? (
          <p className="text-sm text-muted">No outstanding invoices. All clear.</p>
        ) : (
          <div className="space-y-6">
            {agedBuckets.map((bucket, bucketIndex) => {
              if (bucket.rows.length === 0) return null;
              const isCurrentBucket = bucketIndex === 0;
              const headerColour = isCurrentBucket
                ? 'text-text'
                : bucketIndex === 1
                ? 'text-warning'
                : bucketIndex === 2
                ? 'text-orange-400'
                : 'text-danger';

              return (
                <div key={bucketIndex}>
                  <div className={cn('text-xs font-mono uppercase tracking-wider mb-2 font-bold', headerColour)}>
                    {bucket.label} — {formatCurrency(bucket.total)}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs font-mono text-muted uppercase tracking-wider border-b border-border">
                          <th className="text-left py-2 px-3">Client</th>
                          <th className="text-left py-2 px-3">Invoice #</th>
                          <th className="text-left py-2 px-3">Due Date</th>
                          <th className="text-right py-2 px-3">Days Overdue</th>
                          <th className="text-right py-2 px-3">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bucket.rows.map(row => (
                          <tr key={row.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                            <td className="py-2 px-3 text-sm">{row.client_name}</td>
                            <td className="py-2 px-3 font-mono text-sm text-muted">{row.invoice_number}</td>
                            <td className="py-2 px-3 text-sm text-muted">{row.due_date ? formatDate(row.due_date) : '—'}</td>
                            <td className={cn('py-2 px-3 text-right font-mono text-sm', row.days_overdue > 0 ? headerColour : 'text-muted')}>
                              {row.days_overdue > 0 ? `${row.days_overdue}d` : 'Current'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-sm font-medium">{formatCurrency(row.total_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            <div className="border-t-2 border-border pt-4 flex justify-between items-baseline">
              <span className="text-muted font-mono text-sm uppercase tracking-wider">Total Outstanding</span>
              <span className="text-2xl font-condensed font-bold text-danger">{formatCurrency(agedGrandTotal)}</span>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

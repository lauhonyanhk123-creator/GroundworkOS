'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface CISEntry {
  subcontractor_id: string;
  subcontractor_name: string;
  utr_number: string | null;
  invoice_id: string;
  invoice_number: string;
  gross_payment: number;
  cis_deduction: number;
  net_payment: number;
}

interface CISTotals {
  gross: number;
  deductions: number;
  net: number;
}

interface CISReturn {
  month_label: string;
  entries: CISEntry[];
  totals: CISTotals;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CISReturnPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  const [cisReturn, setCisReturn] = useState<CISReturn | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = useRef(createClient());

  const loadCISReturn = useCallback(async (month: number, year: number) => {
    setIsLoading(true);
    setError(null);
    setCisReturn(null);
    try {
      const monthStr = String(month).padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();
      const monthStart = `${year}-${monthStr}-01`;
      const monthEnd = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}T23:59:59`;

      const { data: invoices, error: invError } = await supabase.current
        .from('invoices')
        .select(`
          id,
          invoice_number,
          subtotal,
          total_amount,
          paid_at,
          jobs:job_id (
            id,
            title,
            subcontractor_id
          )
        `)
        .eq('status', 'paid')
        .gte('paid_at', monthStart)
        .lte('paid_at', monthEnd);

      if (invError) throw invError;

      const { data: subcontractors, error: subError } = await supabase.current
        .from('subcontractors')
        .select('id, company_name, utr_number');

      if (subError) throw subError;

      const subMap = new Map<string, { company_name: string; utr_number: string | null }>();
      for (const s of subcontractors ?? []) {
        subMap.set(s.id, { company_name: s.company_name, utr_number: s.utr_number });
      }

      const entries: CISEntry[] = [];

      for (const inv of invoices ?? []) {
        const job = (inv.jobs as unknown) as { id: string; title: string; subcontractor_id: string | null } | null;
        if (!job?.subcontractor_id) continue;

        const sub = subMap.get(job.subcontractor_id);
        if (!sub) continue;

        const gross = (inv.subtotal as number | null) ?? (inv.total_amount as number | null) ?? 0;
        const deduction = Math.round(gross * 0.20 * 100) / 100;
        const net = Math.round((gross - deduction) * 100) / 100;

        entries.push({
          subcontractor_id: job.subcontractor_id,
          subcontractor_name: sub.company_name,
          utr_number: sub.utr_number,
          invoice_id: inv.id as string,
          invoice_number: inv.invoice_number as string,
          gross_payment: gross,
          cis_deduction: deduction,
          net_payment: net,
        });
      }

      const totals = entries.reduce<CISTotals>(
        (acc, e) => ({
          gross: Math.round((acc.gross + e.gross_payment) * 100) / 100,
          deductions: Math.round((acc.deductions + e.cis_deduction) * 100) / 100,
          net: Math.round((acc.net + e.net_payment) * 100) / 100,
        }),
        { gross: 0, deductions: 0, net: 0 }
      );

      const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

      setCisReturn({ month_label: monthLabel, entries, totals });
    } catch (err) {
      console.error('[CISReturn]', err);
      setError('Failed to load CIS return. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCISReturn(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear, loadCISReturn]);

  function handleExportCSV() {
    if (!cisReturn) return;

    const rows: string[][] = [
      ['Subcontractor', 'UTR Number', 'Invoice #', 'Gross Payment', 'CIS Deduction (20%)', 'Net Payment'],
    ];

    for (const entry of cisReturn.entries) {
      rows.push([
        entry.subcontractor_name,
        entry.utr_number ?? '',
        entry.invoice_number,
        entry.gross_payment.toFixed(2),
        entry.cis_deduction.toFixed(2),
        entry.net_payment.toFixed(2),
      ]);
    }

    rows.push(['', '', 'TOTALS', cisReturn.totals.gross.toFixed(2), cisReturn.totals.deductions.toFixed(2), cisReturn.totals.net.toFixed(2)]);

    const csv = rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CIS-Return-${cisReturn.month_label.replace(/\s/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />Back to Reports
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-condensed font-bold">CIS Monthly Return</h1>
            <p className="text-muted text-sm mt-1">Construction Industry Scheme deductions</p>
          </div>
        </div>
        {cisReturn && cisReturn.entries.length > 0 && (
          <Button variant="ghost" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
        )}
      </div>

      <Panel title="Select Period">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-surface-2 border border-border text-text px-3 py-2 text-sm focus:outline-none focus:border-yellow"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-surface-2 border border-border text-text px-3 py-2 text-sm focus:outline-none focus:border-yellow"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </Panel>

      {error && (
        <div className="p-4 rounded bg-danger/10 border border-danger/30 text-danger text-sm">
          {error}
        </div>
      )}

      <Panel title={cisReturn ? `CIS Return — ${cisReturn.month_label}` : 'CIS Return'}>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
          </div>
        ) : !cisReturn || cisReturn.entries.length === 0 ? (
          <p className="text-sm text-muted">No subcontractor payments found for this period.</p>
        ) : (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs font-mono text-muted uppercase tracking-wider border-b border-border">
                    <th className="text-left py-3 px-4">Subcontractor</th>
                    <th className="text-left py-3 px-4">UTR Number</th>
                    <th className="text-left py-3 px-4">Invoice #</th>
                    <th className="text-right py-3 px-4">Gross Payment</th>
                    <th className="text-right py-3 px-4">CIS Deduction (20%)</th>
                    <th className="text-right py-3 px-4">Net Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {cisReturn.entries.map((entry) => (
                    <tr key={entry.invoice_id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                      <td className="py-3 px-4 font-medium">{entry.subcontractor_name}</td>
                      <td className="py-3 px-4 font-mono text-sm text-muted">{entry.utr_number ?? '—'}</td>
                      <td className="py-3 px-4 font-mono text-sm text-muted">{entry.invoice_number}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(entry.gross_payment)}</td>
                      <td className="py-3 px-4 text-right font-mono text-danger">{formatCurrency(entry.cis_deduction)}</td>
                      <td className="py-3 px-4 text-right font-mono text-success">{formatCurrency(entry.net_payment)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td colSpan={3} className="py-3 px-4 text-xs font-mono text-muted uppercase tracking-wider font-bold">Totals</td>
                    <td className="py-3 px-4 text-right font-condensed font-bold text-lg">{formatCurrency(cisReturn.totals.gross)}</td>
                    <td className="py-3 px-4 text-right font-condensed font-bold text-lg text-danger">{formatCurrency(cisReturn.totals.deductions)}</td>
                    <td className="py-3 px-4 text-right font-condensed font-bold text-lg text-success">{formatCurrency(cisReturn.totals.net)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
              <div className="p-4 bg-surface-2 rounded">
                <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Total Gross</div>
                <div className="text-2xl font-condensed font-bold">{formatCurrency(cisReturn.totals.gross)}</div>
              </div>
              <div className="p-4 bg-surface-2 rounded">
                <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">CIS Deducted</div>
                <div className="text-2xl font-condensed font-bold text-danger">{formatCurrency(cisReturn.totals.deductions)}</div>
              </div>
              <div className="p-4 bg-surface-2 rounded">
                <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Net Paid</div>
                <div className="text-2xl font-condensed font-bold text-success">{formatCurrency(cisReturn.totals.net)}</div>
              </div>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

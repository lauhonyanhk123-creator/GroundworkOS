'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Briefcase, FileText, Users } from 'lucide-react';

type RevenueData = {
  month: string;
  total: number;
  invoice_count: number;
};

type PipelineData = {
  status: string;
  count: number;
  value: number;
};

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [pipelineData, setPipelineData] = useState<PipelineData[]>([]);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [maxRevenue, setMaxRevenue] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
      setRevenueData([
        { month: 'Nov', total: 12000, invoice_count: 3 },
        { month: 'Dec', total: 8500, invoice_count: 2 },
        { month: 'Jan', total: 15000, invoice_count: 4 },
        { month: 'Feb', total: 18500, invoice_count: 5 },
        { month: 'Mar', total: 22000, invoice_count: 6 },
        { month: 'Apr', total: 16800, invoice_count: 4 },
      ]);
      setPipelineData([
        { status: 'Active', count: 5, value: 125000 },
        { status: 'Quoted', count: 3, value: 95000 },
        { status: 'Complete', count: 12, value: 285000 },
      ]);
      setMaxRevenue(25000);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;
  };

  const totalRevenue = revenueData.reduce((sum, data) => sum + data.total, 0);
  const averageRevenue = totalRevenue / revenueData.length;
  const totalJobs = pipelineData.reduce((sum, data) => sum + data.count, 0);
  const totalPipelineValue = pipelineData.reduce((sum, data) => sum + data.value, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-condensed font-bold">Reports</h1>
          <p className="text-muted text-sm mt-1">Business insights and analytics</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded" />
          ))
        ) : (
          <>
            <StatCard
              label="Total Revenue (6mo)"
              value={formatCurrency(totalRevenue)}
              barPercent={80}
            />
            <StatCard
              label="Average Monthly"
              value={formatCurrency(averageRevenue)}
              barPercent={60}
            />
            <StatCard
              label="Total Jobs"
              value={totalJobs}
              barPercent={40}
            />
            <StatCard
              label="Pipeline Value"
              value={formatCurrency(totalPipelineValue)}
              barPercent={70}
            />
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Panel title="Revenue (Last 6 Months)">
          {isLoading ? (
            <Skeleton className="h-64 rounded" />
          ) : (
            <div className="space-y-4">
              {/* Simple Bar Chart */}
              <div className="flex items-end justify-between gap-4 h-64">
                {revenueData.map((data, index) => {
                  const heightPercent = (data.total / maxRevenue) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex flex-col items-center">
                        <div className="text-xs font-mono text-muted mb-1">
                          {formatCurrency(data.total)}
                        </div>
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

              {/* Summary */}
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Total Invoices</span>
                  <span className="font-mono">
                    {revenueData.reduce((sum, d) => sum + d.invoice_count, 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Average per Invoice</span>
                  <span className="font-mono">
                    {formatCurrency(totalRevenue / revenueData.reduce((sum, d) => sum + d.invoice_count, 0))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </Panel>

        {/* Pipeline Summary */}
        <Panel title="Pipeline Summary">
          {isLoading ? (
            <Skeleton className="h-64 rounded" />
          ) : (
            <div className="space-y-4">
              {pipelineData.map((data, index) => (
                <div key={index} className="p-4 bg-surface-2 rounded">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {data.status === 'Active' && <Briefcase className="w-5 h-5 text-yellow" />}
                      {data.status === 'Quoted' && <FileText className="w-5 h-5 text-yellow" />}
                      {data.status === 'Complete' && <TrendingUp className="w-5 h-5 text-success" />}
                      <div>
                        <div className="font-medium">{data.status} Jobs</div>
                        <div className="text-xs text-muted">{data.count} jobs</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-condensed font-bold">{formatCurrency(data.value)}</div>
                    </div>
                  </div>
                  <div className="w-full bg-surface-3 rounded-full h-2 overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-500',
                        data.status === 'Active' && 'bg-yellow',
                        data.status === 'Quoted' && 'bg-warning',
                        data.status === 'Complete' && 'bg-success'
                      )}
                      style={{ width: `${(data.value / totalPipelineValue) * 100}%` }}
                    />
                  </div>
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

      {/* AI Insights */}
      <Panel title="AI Business Insights">
        {isLoading ? (
          <Skeleton className="h-32 rounded" />
        ) : (
          <div className="space-y-4">
            {aiInsights ? (
              <div className="p-4 bg-yellow/10 border border-yellow/30 rounded">
                <p className="text-sm">{aiInsights}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-surface-2 rounded border-l-2 border-yellow">
                  <div className="font-medium mb-2">💡 Key Insight #1</div>
                  <p className="text-sm text-muted">
                    Revenue has increased by 40% over the last 6 months. Consider hiring additional crew to handle the growing workload.
                  </p>
                </div>
                <div className="p-4 bg-surface-2 rounded border-l-2 border-warning">
                  <div className="font-medium mb-2">⚠️ Attention Required</div>
                  <p className="text-sm text-muted">
                    You have £95,000 in quoted work waiting for approval. Follow up with these clients to improve conversion rate.
                  </p>
                </div>
                <div className="p-4 bg-surface-2 rounded border-l-2 border-success">
                  <div className="font-medium mb-2">✅ Success</div>
                  <p className="text-sm text-muted">
                    Your completion rate is excellent at 12 jobs. Average invoice value has increased to £4,200.
                  </p>
                </div>
                <Button className="w-full" variant="ghost">
                  Generate AI Report
                </Button>
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

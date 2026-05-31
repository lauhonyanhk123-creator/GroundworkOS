'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChatPanel } from '@/components/ai/chat-panel';
import { StatCard } from '@/components/ui/stat-card';
import { Panel } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Job, Invoice, Document, ScheduleEntry } from '@/types';

interface DashboardData {
  activeJobs: Job[];
  activeCount: number;
  quotedCount: number;
  totalOutstanding: number;
  overdueCount: number;
  pendingQuotesCount: number;
  todaySchedule: ScheduleEntry[];
  weeklySchedule: Record<string, ScheduleEntry[]>;
  expiringDocs: Document[];
  expiredDocs: Document[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const today = new Date().toISOString().split('T')[0];
        const monday = getMonday(new Date());
        const friday = new Date(monday);
        friday.setDate(monday.getDate() + 4);
        const weekStart = monday.toISOString();
        const weekEnd = new Date(friday.setHours(23, 59, 59)).toISOString();

        const [
          { data: jobs },
          { data: invoices },
          { data: documents },
          { data: schedule },
        ] = await Promise.all([
          supabase.from('jobs').select('*').not('status', 'in', '("complete","cancelled")').order('created_at', { ascending: false }).limit(50),
          supabase.from('invoices').select('*').in('status', ['sent', 'overdue']),
          supabase.from('documents').select('*').in('status', ['expired', 'expiring_soon']).order('expiry_date', { ascending: true }),
          supabase.from('schedule_entries').select('*').gte('start_datetime', weekStart).lte('start_datetime', weekEnd).order('start_datetime', { ascending: true }),
        ]);

        const allJobs: Job[] = jobs ?? [];
        const allInvoices: Invoice[] = invoices ?? [];
        const allDocs: Document[] = documents ?? [];
        const allSchedule: ScheduleEntry[] = schedule ?? [];

        const activeJobs = allJobs.filter((j) => j.status === 'active').slice(0, 6);
        const activeCount = allJobs.filter((j) => j.status === 'active').length;
        const quotedCount = allJobs.filter((j) => j.status === 'quoted').length;
        const totalOutstanding = allInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        const overdueCount = allInvoices.filter((inv) => inv.status === 'overdue').length;
        const pendingQuotesCount = quotedCount;

        const todaySchedule = allSchedule.filter(
          (e) => e.start_datetime.startsWith(today)
        );

        const weeklySchedule: Record<string, ScheduleEntry[]> = {
          monday: [], tuesday: [], wednesday: [], thursday: [], friday: [],
        };
        const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        allSchedule.forEach((entry) => {
          const entryDate = new Date(entry.start_datetime);
          const dayIndex = entryDate.getDay() - 1;
          if (dayIndex >= 0 && dayIndex < 5) {
            weeklySchedule[dayKeys[dayIndex]].push(entry);
          }
        });

        setData({
          activeJobs,
          activeCount,
          quotedCount,
          totalOutstanding,
          overdueCount,
          pendingQuotesCount,
          todaySchedule,
          weeklySchedule,
          expiringDocs: allDocs.filter((d) => d.status === 'expiring_soon'),
          expiredDocs: allDocs.filter((d) => d.status === 'expired'),
        });
      } catch (err) {
        console.error('[Dashboard] Load error:', err);
        setLoadError('Failed to load dashboard data. Please refresh.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  function getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }

  const getWeekDayDates = () => {
    const monday = getMonday(new Date());
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return { day, date: date.getDate(), isToday: date.toDateString() === new Date().toDateString() };
    });
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-danger mb-2">{loadError}</p>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overdue alert banner */}
      {!isLoading && data && data.overdueCount > 0 && (
        <div className="border border-danger bg-danger/10 rounded p-4 flex items-center gap-4">
          <AlertTriangle className="w-6 h-6 text-danger flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold">
              {data.overdueCount} Overdue Invoice{data.overdueCount !== 1 ? 's' : ''}
            </h4>
            <p className="text-sm text-muted">
              Total outstanding: {formatCurrency(data.totalOutstanding)}
            </p>
          </div>
        </div>
      )}

      {/* Expired docs alert */}
      {!isLoading && data && data.expiredDocs.length > 0 && (
        <div className="border border-warning bg-warning/10 rounded p-4 flex items-center gap-4">
          <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold">
              {data.expiredDocs.length} Expired Document{data.expiredDocs.length !== 1 ? 's' : ''}
            </h4>
            <p className="text-sm text-muted">
              {data.expiredDocs.map((d) => d.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded" />
          ))
        ) : (
          <>
            <StatCard label="Active Jobs" value={data?.activeCount ?? 0} barPercent={60} />
            <StatCard
              label="Outstanding"
              value={formatCurrency(data?.totalOutstanding ?? 0)}
              sub={data?.overdueCount ? `${data.overdueCount} overdue` : undefined}
              barPercent={40}
            />
            <StatCard label="Pending Quotes" value={data?.pendingQuotesCount ?? 0} barPercent={30} />
            <StatCard
              label="Expiring Docs"
              value={data?.expiringDocs.length ?? 0}
              sub={data?.expiredDocs.length ? `${data.expiredDocs.length} expired` : undefined}
              barPercent={data?.expiringDocs.length ? 70 : 0}
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Jobs */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <Skeleton className="h-80 rounded" />
          ) : (
            <Panel
              title="Active Jobs"
              actions={
                <Button variant="ghost" size="sm" onClick={() => router.push('/jobs')}>
                  View All
                </Button>
              }
            >
              {data?.activeJobs.length === 0 ? (
                <div className="text-center py-12 text-muted">No active jobs</div>
              ) : (
                <div className="space-y-4">
                  {data?.activeJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center gap-4 border-b border-border last:border-0 pb-3 last:pb-0"
                    >
                      <div className="font-mono text-sm text-muted w-20">{job.job_number}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{job.title}</div>
                        <div className="text-xs text-muted truncate">{job.site_address ?? '—'}</div>
                      </div>
                      <div className="text-xs text-muted uppercase tracking-wide w-28">
                        {job.type ?? '—'}
                      </div>
                      <Badge status={job.status} />
                      <div className="text-right w-24 font-mono">
                        {job.value ? formatCurrency(job.value) : '—'}
                      </div>
                      <div className="w-32">
                        <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-yellow h-full transition-all"
                            style={{ width: `${job.progress_percent}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted text-right mt-1">{job.progress_percent}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {/* This Week Schedule */}
          {isLoading ? (
            <Skeleton className="h-48 rounded mt-6" />
          ) : (
            <Panel title="This Week" className="mt-6">
              <div className="grid grid-cols-5 gap-2 border-b border-border pb-4">
                {getWeekDayDates().map((day) => (
                  <div
                    key={day.day}
                    className={cn('text-center', day.isToday ? 'text-yellow' : 'text-muted')}
                  >
                    <div className="text-xs font-mono uppercase">{day.day}</div>
                    <div className="text-lg font-condensed font-bold">{day.date}</div>
                    <div className="flex justify-center gap-1 mt-1">
                      {(data?.weeklySchedule[day.day.toLowerCase() as keyof typeof data.weeklySchedule]?.length ?? 0) > 0 && (
                        <span className="w-2 h-2 rounded-full bg-yellow" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                {data?.todaySchedule.length === 0 ? (
                  <div className="text-center py-8 text-muted">Nothing scheduled for today</div>
                ) : (
                  data?.todaySchedule.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 p-3 bg-surface-2 rounded">
                      <div className="text-xs font-mono text-muted">
                        {new Date(entry.start_datetime).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{entry.title}</div>
                        <div className="text-xs text-muted">
                          {entry.crew_count} crew
                          {entry.plant_assigned && ` • ${entry.plant_assigned}`}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <ChatPanel />

          {/* Alerts Panel */}
          {isLoading ? (
            <Skeleton className="h-64 rounded" />
          ) : (
            <Panel title="Alerts">
              <div className="space-y-3">
                {data?.expiringDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start gap-3 p-3 bg-warning/10 border border-warning/30 rounded"
                  >
                    <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{doc.name}</div>
                      <div className="text-xs text-muted">
                        Expires{' '}
                        {doc.expiry_date
                          ? new Date(doc.expiry_date).toLocaleDateString('en-GB')
                          : 'soon'}
                      </div>
                    </div>
                  </div>
                ))}

                {data?.overdueCount !== undefined && data.overdueCount > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-danger/10 border border-danger/30 rounded">
                    <AlertTriangle className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {data.overdueCount} Overdue Invoice{data.overdueCount !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-muted">
                        {formatCurrency(data.totalOutstanding)} outstanding
                      </div>
                    </div>
                  </div>
                )}

                {(data?.expiringDocs.length ?? 0) === 0 && (data?.overdueCount ?? 0) === 0 && (
                  <div className="text-center py-8 text-muted">No alerts</div>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { Btn } from '../components/ui/Btn';
import { formatCurrency, formatDate, getMonday } from '../lib/utils';
import { useApp } from '../store/AppContext';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2.5 rounded-lg text-xs" style={{ backgroundColor: '#181818', border: '1px solid #2a2a2a' }}>
      <div className="font-medium mb-1.5" style={{ color: '#e2e2e2', fontFamily: "'Barlow', sans-serif" }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span style={{ color: '#5a5a5a' }}>{p.name}: </span>
          <span style={{ color: '#e2e2e2', fontFamily: "'DM Mono', monospace" }}>{typeof p.value === 'number' ? formatCurrency(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function DashboardPage() {
  const { state } = useApp();
  const { jobs, invoices, documents, schedule, quotes } = state;

  const today = new Date().toISOString().split('T')[0];
  const activeJobs = jobs.filter(j => j.status === 'active');
  const outstandingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const totalOutstanding = outstandingInvoices.reduce((s, i) => s + i.total_amount, 0);
  const totalOverdue = overdueInvoices.reduce((s, i) => s + i.total_amount, 0);
  const totalCollected = paidInvoices.reduce((s, i) => s + i.total_amount, 0);
  const totalPipeline = jobs.filter(j => j.status !== 'cancelled').reduce((s, j) => s + (j.value ?? 0), 0);
  const expiringDocs = documents.filter(d => d.status === 'expiring_soon');
  const expiredDocs = documents.filter(d => d.status === 'expired');
  const todaySchedule = schedule.filter(e => e.start_datetime.startsWith(today));
  const avgProgress = activeJobs.length ? Math.round(activeJobs.reduce((s, j) => s + (j.progress_percent ?? 0), 0) / activeJobs.length) : 0;
  const quotePipelineValue = jobs.filter(j => j.status === 'quoted').reduce((s, j) => s + (j.value ?? 0), 0);

  const monday = getMonday(new Date());
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    return { day, date: d.getDate(), isToday: dateStr === today, entries: schedule.filter(e => e.start_datetime.startsWith(dateStr)) };
  });

  const monthMap = new Map<string, { invoiced: number; collected: number; month: string }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-GB', { month: 'short' });
    monthMap.set(key, { invoiced: 0, collected: 0, month: label });
  }
  for (const inv of invoices) {
    const key = inv.issued_date?.slice(0, 7) ?? '';
    if (monthMap.has(key)) monthMap.get(key)!.invoiced += inv.total_amount;
  }
  for (const inv of paidInvoices) {
    if (!inv.paid_at) continue;
    const key = inv.paid_at.slice(0, 7);
    if (monthMap.has(key)) monthMap.get(key)!.collected += inv.total_amount;
  }
  const revenueData = Array.from(monthMap.values());

  const hasAlerts = overdueInvoices.length > 0 || expiringDocs.length > 0 || expiredDocs.length > 0;

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pipeline', value: formatCurrency(totalPipeline), sub: `${activeJobs.length} active jobs` },
          { label: 'Collected', value: formatCurrency(totalCollected), sub: `${paidInvoices.length} paid invoices` },
          { label: 'Outstanding', value: formatCurrency(totalOutstanding), sub: `${outstandingInvoices.length} invoices` },
          { label: 'Overdue', value: formatCurrency(totalOverdue), sub: `${overdueInvoices.length} overdue`, isDanger: overdueInvoices.length > 0 },
        ].map(({ label, value, sub, isDanger }) => (
          <div key={label} className="p-5 rounded-lg" style={{ backgroundColor: '#111111', border: '1px solid #1a1a1a' }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#5a5a5a', letterSpacing: '0.08em' }}>{label}</p>
            <p className="text-3xl font-bold leading-none mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: isDanger && totalOverdue > 0 ? '#e03a3a' : '#e2e2e2' }}>{value}</p>
            <p className="text-xs" style={{ color: '#5a5a5a' }}>{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Panel title="Revenue vs Collected — Last 6 Months" actions={
            <Link href="/reports"><Btn variant="ghost" size="sm">Reports <ArrowRight className="w-3 h-3" /></Btn></Link>
          }>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} barGap={4} barCategoryGap="32%">
                  <CartesianGrid vertical={false} stroke="#161616" />
                  <XAxis dataKey="month" tick={{ fill: '#5a5a5a', fontSize: 11, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#5a5a5a', fontSize: 10, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '' : `£${(v / 1000).toFixed(0)}k`} width={38} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar dataKey="invoiced" name="Invoiced" fill="#2a2a2a" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="collected" name="Collected" fill="#3db56d" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-5 mt-3">
              <div className="flex items-center gap-1.5 text-xs" style={{ color: '#5a5a5a' }}>
                <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: '#2a2a2a' }} /> Invoiced
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: '#5a5a5a' }}>
                <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: '#3db56d' }} /> Collected
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="This Week">
            <div className="grid grid-cols-5 gap-1 mb-4 pb-4" style={{ borderBottom: '1px solid #1a1a1a' }}>
              {weekDays.map(d => (
                <div key={d.day} className="text-center">
                  <div className="text-xs mb-1" style={{ color: d.isToday ? '#FFD600' : '#5a5a5a', fontFamily: "'DM Mono', monospace" }}>{d.day}</div>
                  <div className="text-lg font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: d.isToday ? '#FFD600' : '#3a3a3a' }}>{d.date}</div>
                  {d.entries.length > 0 && (
                    <div className="flex justify-center mt-1">
                      <span className="w-1 h-1 rounded-full" style={{ backgroundColor: d.isToday ? '#FFD600' : '#5a5a5a' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {todaySchedule.length === 0 ? (
              <p className="text-xs text-center py-2" style={{ color: '#3a3a3a' }}>Nothing scheduled today</p>
            ) : todaySchedule.slice(0, 3).map(entry => (
              <div key={entry.id} className="flex items-start gap-3 mb-3 last:mb-0">
                <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: '#5a5a5a', fontFamily: "'DM Mono', monospace" }}>
                  {new Date(entry.start_datetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div>
                  <div className="text-sm font-medium leading-snug" style={{ color: '#e2e2e2' }}>{entry.title}</div>
                  {(entry.crew_count || entry.job) && (
                    <div className="text-xs mt-0.5" style={{ color: '#5a5a5a' }}>
                      {entry.crew_count ? `${entry.crew_count} crew` : ''}{entry.job ? ` · ${entry.job.job_number}` : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </Panel>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Panel title="Active Jobs" actions={<Link href="/jobs"><Btn variant="ghost" size="sm">All jobs <ArrowRight className="w-3 h-3" /></Btn></Link>} noPad>
            {activeJobs.length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: '#3a3a3a' }}>No active jobs</p>
            ) : activeJobs.slice(0, 5).map((job, i) => (
              <Link key={job.id} href="/jobs">
                <div className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[#161616] cursor-pointer" style={{ borderBottom: i < Math.min(activeJobs.length, 5) - 1 ? '1px solid #1a1a1a' : 'none' }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate mb-0.5" style={{ color: '#e2e2e2' }}>{job.title}</div>
                    <div className="text-xs" style={{ color: '#5a5a5a' }}>{job.client?.company_name ?? '—'}</div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="w-28 hidden sm:block">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs" style={{ color: '#5a5a5a', fontFamily: "'DM Mono', monospace" }}>{job.progress_percent}%</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#1f1f1f' }}>
                        <div className="h-full rounded-full" style={{ width: `${job.progress_percent}%`, backgroundColor: '#3db56d' }} />
                      </div>
                    </div>
                    <span className="text-sm font-medium hidden md:block" style={{ color: '#e2e2e2', fontFamily: "'DM Mono', monospace" }}>{job.value ? formatCurrency(job.value) : '—'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </Panel>
        </div>

        {hasAlerts && (
          <Panel title="Alerts">
            <div className="space-y-3">
              {overdueInvoices.slice(0, 3).map(inv => (
                <Link key={inv.id} href="/invoices">
                  <div className="flex items-start gap-2.5 cursor-pointer group">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#e03a3a' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium group-hover:text-white transition-colors" style={{ color: '#e2e2e2' }}>{inv.invoice_number}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#5a5a5a' }}>{formatCurrency(inv.total_amount)} overdue</div>
                    </div>
                  </div>
                </Link>
              ))}
              {[...expiredDocs, ...expiringDocs].slice(0, 3).map(doc => (
                <Link key={doc.id} href="/documents">
                  <div className="flex items-start gap-2.5 cursor-pointer group">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: doc.status === 'expired' ? '#e03a3a' : '#e07b39' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium group-hover:text-white transition-colors truncate" style={{ color: '#e2e2e2' }}>{doc.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#5a5a5a' }}>
                        {doc.status === 'expired' ? 'Expired' : 'Expiring'} {formatDate(doc.expiry_date)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Panel>
        )}

        {!hasAlerts && (
          <Panel title="Quote Pipeline">
            <div className="space-y-3">
              {[
                { label: 'Active', count: activeJobs.length, value: activeJobs.reduce((s, j) => s + (j.value ?? 0), 0), color: '#3db56d' },
                { label: 'Quoted', count: jobs.filter(j => j.status === 'quoted').length, value: quotePipelineValue, color: '#c4a800' },
                { label: 'Enquiry', count: jobs.filter(j => j.status === 'enquiry').length, value: jobs.filter(j => j.status === 'enquiry').reduce((s, j) => s + (j.value ?? 0), 0), color: '#4d90d4' },
              ].map(({ label, count, value, color }) => (
                <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm" style={{ color: '#a0a0a0' }}>{label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium" style={{ color: '#e2e2e2', fontFamily: "'DM Mono', monospace" }}>{formatCurrency(value)}</span>
                    <span className="text-xs ml-2" style={{ color: '#5a5a5a' }}>{count}</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs" style={{ color: '#5a5a5a' }}>Avg progress</span>
                <span className="text-sm font-medium" style={{ color: '#e2e2e2', fontFamily: "'DM Mono', monospace" }}>{avgProgress}%</span>
              </div>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

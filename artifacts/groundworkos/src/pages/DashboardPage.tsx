import { AlertTriangle, ArrowRight, TrendingUp, Briefcase, Receipt, Clock, FileText, Users } from 'lucide-react';
import { Link } from 'wouter';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
} from 'recharts';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { Btn } from '../components/ui/Btn';
import { formatCurrency, formatDate, getMonday } from '../lib/utils';
import { useApp } from '../store/AppContext';

const YELLOW = '#FFD600';
const RED = '#ff4444';
const GREEN = '#4ade80';
const ORANGE = '#fb923c';
const BLUE = '#60a5fa';
const PURPLE = '#a78bfa';

const JOB_TYPE_COLORS: Record<string, string> = {
  drainage: '#60a5fa', foundations: '#fb923c', excavation: '#a78bfa',
  kerbing: '#4ade80', sewers: '#f472b6', reinstatement: '#FFD600',
  piling: '#34d399', subbase: '#fbbf24', utilities: '#818cf8', groundworks: '#94a3b8',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded text-xs" style={{ backgroundColor: '#1c1c1c', border: '1px solid #3a3a3a', fontFamily: "'DM Mono', monospace" }}>
      <div className="font-bold mb-1" style={{ color: '#e8e8e8' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span style={{ color: '#888888' }}>{p.name}: </span>
          <span style={{ color: '#e8e8e8' }}>{typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function DashboardPage() {
  const { state } = useApp();
  const { jobs, invoices, documents, schedule, subcontractors, plant, quotes } = state;

  const today = new Date().toISOString().split('T')[0];
  const activeJobs = jobs.filter(j => j.status === 'active');
  const quotedJobs = jobs.filter(j => j.status === 'quoted');
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
  const quotePipelineValue = quotedJobs.reduce((s, j) => s + (j.value ?? 0), 0);

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

  const jobStatusData = [
    { name: 'Active', value: activeJobs.length, color: GREEN },
    { name: 'Quoted', value: quotedJobs.length, color: YELLOW },
    { name: 'Enquiry', value: jobs.filter(j => j.status === 'enquiry').length, color: BLUE },
    { name: 'Complete', value: jobs.filter(j => j.status === 'complete').length, color: '#3a3a3a' },
    { name: 'On Hold', value: jobs.filter(j => j.status === 'on_hold').length, color: ORANGE },
  ].filter(d => d.value > 0);

  const jobTypeData = Object.entries(
    jobs.reduce((acc, j) => {
      if (!j.type) return acc;
      acc[j.type] = (acc[j.type] ?? 0) + (j.value ?? 0);
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, color: JOB_TYPE_COLORS[name] ?? '#666666' }))
   .sort((a, b) => b.value - a.value).slice(0, 6);

  const cashFlowData = [
    { name: 'Collected', value: totalCollected, color: GREEN },
    { name: 'Outstanding', value: totalOutstanding - totalOverdue, color: YELLOW },
    { name: 'Overdue', value: totalOverdue, color: RED },
  ];
  const cashFlowTotal = cashFlowData.reduce((s, d) => s + d.value, 0) || 1;

  const kpis = [
    {
      label: 'Pipeline Value',
      value: formatCurrency(totalPipeline),
      sub: `${jobs.filter(j => j.status !== 'cancelled').length} live jobs`,
      color: YELLOW,
      icon: <Briefcase className="w-4 h-4" />,
      change: `${activeJobs.length} active · ${quotedJobs.length} quoted`,
    },
    {
      label: 'Revenue Collected',
      value: formatCurrency(totalCollected),
      sub: `${paidInvoices.length} paid invoices`,
      color: GREEN,
      icon: <TrendingUp className="w-4 h-4" />,
      change: paidInvoices.length > 0 ? `avg ${formatCurrency(Math.round(totalCollected / paidInvoices.length))} / inv` : '—',
    },
    {
      label: 'Outstanding',
      value: formatCurrency(totalOutstanding),
      sub: `${outstandingInvoices.length} invoices`,
      color: YELLOW,
      icon: <Receipt className="w-4 h-4" />,
      change: null,
    },
    {
      label: 'Overdue',
      value: formatCurrency(totalOverdue),
      sub: `${overdueInvoices.length} overdue`,
      color: overdueInvoices.length > 0 ? RED : '#666666',
      icon: <AlertTriangle className="w-4 h-4" />,
      change: null,
    },
    {
      label: 'Active Jobs',
      value: activeJobs.length,
      sub: `avg ${avgProgress}% progress`,
      color: GREEN,
      icon: <Clock className="w-4 h-4" />,
      change: `${jobs.filter(j => j.status === 'complete').length} complete`,
    },
    {
      label: 'Quote Pipeline',
      value: formatCurrency(quotePipelineValue),
      sub: `${quotedJobs.length} quotes pending`,
      color: BLUE,
      icon: <FileText className="w-4 h-4" />,
      change: null,
    },
  ];

  return (
    <div className="space-y-4">
      {overdueInvoices.length > 0 && (
        <div className="rounded p-3 flex items-center gap-3" style={{ backgroundColor: '#1a0000', border: '1px solid rgba(255,68,68,0.4)' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: RED }} />
          <span className="text-sm font-semibold flex-1" style={{ color: RED }}>
            {overdueInvoices.length} overdue invoice{overdueInvoices.length !== 1 ? 's' : ''} —{' '}
            <span className="font-normal" style={{ color: '#888888' }}>{formatCurrency(totalOverdue)} outstanding</span>
          </span>
          <Link href="/invoices"><Btn variant="ghost" size="sm">View <ArrowRight className="w-3 h-3" /></Btn></Link>
        </div>
      )}
      {(expiringDocs.length > 0 || expiredDocs.length > 0) && (
        <div className="rounded p-3 flex items-center gap-3" style={{ backgroundColor: '#1f1500', border: '1px solid rgba(251,146,60,0.4)' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: ORANGE }} />
          <span className="text-sm flex-1" style={{ color: ORANGE }}>
            {expiredDocs.length > 0 && <strong>{expiredDocs.length} expired · </strong>}
            <span style={{ color: '#888888' }}>{[...expiredDocs, ...expiringDocs].slice(0, 3).map(d => d.name).join(', ')}</span>
          </span>
          <Link href="/documents"><Btn variant="ghost" size="sm">View <ArrowRight className="w-3 h-3" /></Btn></Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="rounded p-4 relative overflow-hidden" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#555555' }}>{kpi.label}</span>
              <span style={{ color: kpi.color, opacity: 0.7 }}>{kpi.icon}</span>
            </div>
            <div className="text-2xl font-bold leading-none mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: kpi.color }}>{kpi.value}</div>
            <div className="text-xs font-mono mt-1" style={{ color: '#555555' }}>{kpi.sub}</div>
            {kpi.change && <div className="text-xs mt-1 font-mono" style={{ color: '#444444' }}>{kpi.change}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <Panel title="Revenue vs Invoiced — Last 6 Months" actions={<Link href="/reports"><Btn variant="ghost" size="sm">Full Report <ArrowRight className="w-3 h-3" /></Btn></Link>}>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} barGap={3} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke="#1e1e1e" />
                  <XAxis dataKey="month" tick={{ fill: '#555555', fontSize: 11, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#555555', fontSize: 10, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '' : `£${(v / 1000).toFixed(0)}k`} width={40} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="invoiced" name="Invoiced" fill={YELLOW} fillOpacity={0.4} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="collected" name="Collected" fill={GREEN} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: '#666666' }}>
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: YELLOW, opacity: 0.5 }} /> Invoiced
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: '#666666' }}>
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: GREEN }} /> Collected
              </div>
            </div>
          </Panel>
        </div>

        <div className="lg:col-span-2">
          <Panel title="Job Status Breakdown">
            <div className="flex items-center gap-4" style={{ height: 220 }}>
              <div style={{ width: 130, height: 130, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={jobStatusData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={2} dataKey="value" stroke="none">
                      {jobStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {jobStatusData.map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs font-mono" style={{ color: '#888888' }}>{d.name}</span>
                    </div>
                    <span className="text-sm font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: d.color }}>{d.value}</span>
                  </div>
                ))}
                <div className="pt-2" style={{ borderTop: '1px solid #2a2a2a' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono" style={{ color: '#555555' }}>Total Jobs</span>
                    <span className="text-sm font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#e8e8e8' }}>{jobs.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 grid grid-cols-1 gap-4">
          <Panel title="Cash Flow">
            <div className="space-y-2 mb-4">
              {cashFlowData.map(d => (
                <div key={d.name}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs font-mono" style={{ color: '#666666' }}>{d.name}</span>
                    <span className="text-sm font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: d.color }}>{formatCurrency(d.value)}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#1c1c1c' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(d.value / cashFlowTotal) * 100}%`, backgroundColor: d.color }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 overflow-hidden rounded" style={{ height: 8 }}>
              {cashFlowData.map(d => (
                <div key={d.name} className="h-full transition-all duration-500" style={{ width: `${(d.value / cashFlowTotal) * 100}%`, backgroundColor: d.color, minWidth: d.value > 0 ? 2 : 0 }} />
              ))}
            </div>
          </Panel>

          <Panel title="Value by Job Type">
            <div style={{ height: 130 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jobTypeData} layout="vertical" barCategoryGap="20%">
                  <XAxis type="number" tick={{ fill: '#555555', fontSize: 10, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#888888', fontSize: 11, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="value" name="Value" radius={[0, 2, 2, 0]}>
                    {jobTypeData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Panel title="This Week">
            <div className="grid grid-cols-5 gap-1 mb-3 pb-3" style={{ borderBottom: '1px solid #2a2a2a' }}>
              {weekDays.map(d => (
                <div key={d.day} className="text-center">
                  <div className="text-xs font-mono uppercase" style={{ color: d.isToday ? YELLOW : '#444444' }}>{d.day}</div>
                  <div className="text-xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: d.isToday ? YELLOW : '#666666' }}>{d.date}</div>
                  {d.entries.length > 0 && (
                    <div className="flex justify-center gap-0.5 mt-0.5">
                      {d.entries.slice(0, 3).map((_, i) => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: YELLOW }} />)}
                    </div>
                  )}
                  <div className="text-xs font-mono mt-0.5" style={{ color: '#444444' }}>{d.entries.length > 0 ? `${d.entries.length}` : ''}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {todaySchedule.length === 0 ? (
                <p className="text-center py-4 text-xs font-mono" style={{ color: '#444444' }}>Nothing scheduled today</p>
              ) : todaySchedule.map(entry => (
                <div key={entry.id} className="flex items-start gap-2.5 p-2.5 rounded" style={{ backgroundColor: '#1c1c1c' }}>
                  <span className="text-xs font-mono flex-shrink-0 mt-0.5" style={{ color: '#444444' }}>
                    {new Date(entry.start_datetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: '#e8e8e8' }}>{entry.title}</div>
                    <div className="text-xs" style={{ color: '#555555' }}>
                      {entry.crew_count ? `${entry.crew_count} crew` : ''}{entry.plant_assigned ? ` · ${entry.plant_assigned}` : ''}{entry.job ? ` · ${entry.job.job_number}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Active Jobs Progress" actions={<Link href="/jobs"><Btn variant="ghost" size="sm">All <ArrowRight className="w-3 h-3" /></Btn></Link>}>
            <div className="space-y-3">
              {activeJobs.length === 0 ? (
                <p className="text-center py-4 text-xs font-mono" style={{ color: '#444444' }}>No active jobs</p>
              ) : activeJobs.slice(0, 4).map(job => (
                <Link key={job.id} href="/jobs">
                  <div className="group cursor-pointer">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-xs font-medium truncate flex-1 mr-2" style={{ color: '#e8e8e8' }}>{job.title}</span>
                      <span className="text-xs font-mono flex-shrink-0" style={{ color: YELLOW }}>{job.progress_percent}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#242424' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${job.progress_percent}%`, backgroundColor: YELLOW }} />
                      </div>
                      <span className="text-xs font-mono flex-shrink-0" style={{ color: '#444444' }}>{job.value ? formatCurrency(job.value) : '—'}</span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#444444' }}>{job.client?.company_name ?? '—'} · {job.type ?? '—'}</div>
                  </div>
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Alerts" actions={<span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: '#1a0000', color: RED, border: '1px solid rgba(255,68,68,0.3)' }}>{expiringDocs.length + expiredDocs.length + overdueInvoices.length}</span>}>
          <div className="space-y-2">
            {expiredDocs.map(doc => (
              <div key={doc.id} className="flex items-start gap-2.5 p-2.5 rounded text-xs" style={{ backgroundColor: '#1a0000', border: '1px solid rgba(255,68,68,0.2)' }}>
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: RED }} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate" style={{ color: '#e8e8e8' }}>{doc.name}</div>
                  <div style={{ color: '#555555' }}>Expired {formatDate(doc.expiry_date)}</div>
                </div>
              </div>
            ))}
            {expiringDocs.map(doc => (
              <div key={doc.id} className="flex items-start gap-2.5 p-2.5 rounded text-xs" style={{ backgroundColor: '#1f1500', border: '1px solid rgba(251,146,60,0.2)' }}>
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: ORANGE }} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate" style={{ color: '#e8e8e8' }}>{doc.name}</div>
                  <div style={{ color: '#555555' }}>Expires {formatDate(doc.expiry_date)}</div>
                </div>
              </div>
            ))}
            {overdueInvoices.map(inv => (
              <div key={inv.id} className="flex items-start gap-2.5 p-2.5 rounded text-xs" style={{ backgroundColor: '#1a0000', border: '1px solid rgba(255,68,68,0.2)' }}>
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: RED }} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium" style={{ color: '#e8e8e8' }}>{inv.invoice_number} — {inv.client?.company_name}</div>
                  <div style={{ color: '#555555' }}>{formatCurrency(inv.total_amount)} overdue · due {formatDate(inv.due_date)}</div>
                </div>
              </div>
            ))}
            {expiringDocs.length === 0 && expiredDocs.length === 0 && overdueInvoices.length === 0 && (
              <p className="text-center py-6 text-xs font-mono" style={{ color: '#444444' }}>No alerts</p>
            )}
          </div>
        </Panel>

        <Panel title="Quick Stats">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Job Value', value: formatCurrency(jobs.reduce((s, j) => s + (j.value ?? 0), 0)), color: YELLOW },
              { label: 'Avg Job Value', value: jobs.length ? formatCurrency(Math.round(jobs.reduce((s, j) => s + (j.value ?? 0), 0) / jobs.length)) : '—', color: '#888888' },
              { label: 'Active Subcons', value: String(subcontractors.filter(s => s.active).length), color: BLUE },
              { label: 'Plant Items', value: String(plant.length), color: PURPLE },
              { label: 'Quotes Sent', value: String(quotes?.filter(q => q.status === 'sent').length ?? 0), color: ORANGE },
              { label: 'Docs Active', value: String(documents.filter(d => d.status === 'valid').length), color: GREEN },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-3 rounded" style={{ backgroundColor: '#1c1c1c' }}>
                <div className="text-xs font-mono mb-1" style={{ color: '#444444' }}>{label}</div>
                <div className="text-xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{value}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Pipeline" actions={<Link href="/jobs"><Btn variant="ghost" size="sm">View All <ArrowRight className="w-3 h-3" /></Btn></Link>}>
          <div className="space-y-3">
            {[
              { label: 'Active', jobs: activeJobs, color: GREEN },
              { label: 'Quoted', jobs: quotedJobs, color: YELLOW },
              { label: 'Enquiry', jobs: jobs.filter(j => j.status === 'enquiry'), color: BLUE },
              { label: 'Complete', jobs: jobs.filter(j => j.status === 'complete'), color: '#3a3a3a' },
            ].map(({ label, jobs: pJobs, color }) => {
              const val = pJobs.reduce((s, j) => s + (j.value ?? 0), 0);
              const pct = totalPipeline > 0 ? (val / totalPipeline) * 100 : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between items-baseline mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-xs font-mono" style={{ color: '#888888' }}>{label} ({pJobs.length})</span>
                    </div>
                    <span className="text-sm font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{formatCurrency(val)}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#1c1c1c' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
            <div className="pt-2 flex justify-between" style={{ borderTop: '1px solid #2a2a2a' }}>
              <span className="text-xs font-mono" style={{ color: '#555555' }}>Total Pipeline</span>
              <span className="text-lg font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: YELLOW }}>{formatCurrency(totalPipeline)}</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

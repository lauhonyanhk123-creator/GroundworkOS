import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { StatCard } from '../components/ui/StatCard';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { Btn } from '../components/ui/Btn';
import { formatCurrency, formatDate, getMonday } from '../lib/utils';
import { useApp } from '../store/AppContext';

export function DashboardPage() {
  const { state } = useApp();
  const { jobs, invoices, documents, schedule, subcontractors, plant } = state;

  const today = new Date().toISOString().split('T')[0];
  const activeJobs = jobs.filter(j => j.status === 'active');
  const quotedJobs = jobs.filter(j => j.status === 'quoted');
  const outstandingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const totalOutstanding = outstandingInvoices.reduce((s, i) => s + i.total_amount, 0);
  const expiringDocs = documents.filter(d => d.status === 'expiring_soon');
  const expiredDocs = documents.filter(d => d.status === 'expired');
  const todaySchedule = schedule.filter(e => e.start_datetime.startsWith(today));

  const monday = getMonday(new Date());
  const weekDays = ['Mon','Tue','Wed','Thu','Fri'].map((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const entries = schedule.filter(e => e.start_datetime.startsWith(dateStr));
    return { day, date: d.getDate(), isToday: dateStr === today, entries };
  });

  return (
    <div className="space-y-5">
      {overdueInvoices.length > 0 && (
        <div className="rounded p-3.5 flex items-center gap-3" style={{ backgroundColor: '#1a0000', border: '1px solid rgba(255,68,68,0.4)' }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#ff4444' }} />
          <div className="flex-1">
            <span className="font-semibold text-sm" style={{ color: '#ff4444' }}>
              {overdueInvoices.length} Overdue Invoice{overdueInvoices.length !== 1 ? 's' : ''} —{' '}
            </span>
            <span className="text-sm" style={{ color: '#888888' }}>{formatCurrency(overdueInvoices.reduce((s,i) => s + i.total_amount, 0))} outstanding</span>
          </div>
          <Link href="/invoices"><Btn variant="ghost" size="sm">View <ArrowRight className="w-3 h-3" /></Btn></Link>
        </div>
      )}

      {(expiringDocs.length > 0 || expiredDocs.length > 0) && (
        <div className="rounded p-3.5 flex items-center gap-3" style={{ backgroundColor: '#1f1500', border: '1px solid rgba(251,146,60,0.4)' }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#fb923c' }} />
          <div className="flex-1">
            {expiredDocs.length > 0 && <span className="font-semibold text-sm" style={{ color: '#fb923c' }}>{expiredDocs.length} expired</span>}
            {expiringDocs.length > 0 && <span className="text-sm" style={{ color: '#888888' }}>{expiredDocs.length > 0 ? ' · ' : ''}{expiringDocs.length} expiring soon — </span>}
            <span className="text-sm" style={{ color: '#666666' }}>{[...expiredDocs, ...expiringDocs].slice(0,3).map(d => d.name).join(', ')}</span>
          </div>
          <Link href="/documents"><Btn variant="ghost" size="sm">View <ArrowRight className="w-3 h-3" /></Btn></Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Jobs" value={activeJobs.length} barPercent={Math.round((activeJobs.length / Math.max(jobs.length, 1)) * 100)} />
        <StatCard label="Outstanding" value={formatCurrency(totalOutstanding)} sub={overdueInvoices.length ? `${overdueInvoices.length} overdue` : undefined} barPercent={45} />
        <StatCard label="Pending Quotes" value={quotedJobs.length} barPercent={30} />
        <StatCard label="Doc Alerts" value={expiringDocs.length + expiredDocs.length} sub={expiredDocs.length ? `${expiredDocs.length} expired` : undefined} barPercent={expiringDocs.length > 0 ? 70 : 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Panel title="Active Jobs" actions={<Link href="/jobs"><Btn variant="ghost" size="sm">View All <ArrowRight className="w-3 h-3" /></Btn></Link>}>
            {activeJobs.length === 0 ? (
              <p className="text-center py-10 text-sm" style={{ color: '#444444' }}>No active jobs</p>
            ) : (
              <div className="space-y-3">
                {activeJobs.slice(0,5).map(job => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded hover:bg-[#1c1c1c] transition-colors cursor-pointer" style={{ borderBottom: '1px solid #1c1c1c' }}>
                      <span className="text-xs font-mono w-20 flex-shrink-0" style={{ color: '#444444' }}>{job.job_number}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: '#e8e8e8' }}>{job.title}</div>
                        <div className="text-xs truncate" style={{ color: '#444444' }}>{job.client?.company_name ?? '—'} · {job.site_address ?? '—'}</div>
                      </div>
                      <span className="text-xs uppercase tracking-wide w-20 hidden sm:block" style={{ color: '#444444', fontFamily: "'DM Mono', monospace" }}>{job.type ?? '—'}</span>
                      <Badge status={job.status} />
                      <span className="text-sm w-20 text-right flex-shrink-0" style={{ color: '#e8e8e8', fontFamily: "'DM Mono', monospace" }}>{job.value ? formatCurrency(job.value) : '—'}</span>
                      <div className="w-24 flex-shrink-0 hidden md:block">
                        <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: '#242424' }}>
                          <div className="h-full rounded-full" style={{ width: `${job.progress_percent}%`, backgroundColor: '#FFD600' }} />
                        </div>
                        <div className="text-xs text-right mt-0.5" style={{ color: '#444444', fontFamily: "'DM Mono', monospace" }}>{job.progress_percent}%</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="This Week">
            <div className="grid grid-cols-5 gap-1 pb-3 mb-3" style={{ borderBottom: '1px solid #2a2a2a' }}>
              {weekDays.map(d => (
                <div key={d.day} className="text-center">
                  <div className="text-xs font-mono uppercase" style={{ color: d.isToday ? '#FFD600' : '#444444' }}>{d.day}</div>
                  <div className="text-lg font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: d.isToday ? '#FFD600' : '#888888' }}>{d.date}</div>
                  <div className="flex justify-center gap-0.5 mt-1">
                    {d.entries.slice(0,3).map((_, i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#FFD600' }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {todaySchedule.length === 0 ? (
                <p className="text-center py-6 text-sm" style={{ color: '#444444' }}>Nothing scheduled for today</p>
              ) : todaySchedule.map(entry => (
                <div key={entry.id} className="flex items-start gap-3 p-3 rounded" style={{ backgroundColor: '#1c1c1c' }}>
                  <span className="text-xs font-mono flex-shrink-0 mt-0.5" style={{ color: '#444444' }}>
                    {new Date(entry.start_datetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: '#e8e8e8' }}>{entry.title}</div>
                    <div className="text-xs" style={{ color: '#666666' }}>
                      {entry.crew_count} crew{entry.plant_assigned ? ` · ${entry.plant_assigned}` : ''}{entry.job ? ` · ${entry.job.job_number}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Pipeline">
            {[
              { label: 'Active', jobs: jobs.filter(j => j.status === 'active'), color: '#FFD600' },
              { label: 'Quoted', jobs: jobs.filter(j => j.status === 'quoted'), color: '#fb923c' },
              { label: 'Enquiry', jobs: jobs.filter(j => j.status === 'enquiry'), color: '#60a5fa' },
            ].map(({ label, jobs: pJobs, color }) => {
              const val = pJobs.reduce((s, j) => s + (j.value ?? 0), 0);
              return (
                <div key={label} className="mb-3">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs font-mono uppercase" style={{ color: '#666666' }}>{label} ({pJobs.length})</span>
                    <span className="text-sm font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{formatCurrency(val)}</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#242424' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, pJobs.length * 20)}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </Panel>

          <Panel title="Alerts">
            <div className="space-y-2">
              {expiringDocs.map(doc => (
                <div key={doc.id} className="flex items-start gap-2.5 p-2.5 rounded text-xs" style={{ backgroundColor: '#1f1500', border: '1px solid rgba(251,146,60,0.2)' }}>
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#fb923c' }} />
                  <div>
                    <div className="font-medium truncate" style={{ color: '#e8e8e8' }}>{doc.name}</div>
                    <div style={{ color: '#666666' }}>Expires {formatDate(doc.expiry_date)}</div>
                  </div>
                </div>
              ))}
              {overdueInvoices.map(inv => (
                <div key={inv.id} className="flex items-start gap-2.5 p-2.5 rounded text-xs" style={{ backgroundColor: '#1a0000', border: '1px solid rgba(255,68,68,0.2)' }}>
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#ff4444' }} />
                  <div>
                    <div className="font-medium" style={{ color: '#e8e8e8' }}>{inv.invoice_number}</div>
                    <div style={{ color: '#666666' }}>{formatCurrency(inv.total_amount)} overdue</div>
                  </div>
                </div>
              ))}
              {expiringDocs.length === 0 && overdueInvoices.length === 0 && (
                <p className="text-center py-6 text-xs" style={{ color: '#444444' }}>No alerts</p>
              )}
            </div>
          </Panel>

          <Panel title="Quick Stats">
            {[
              { label: 'Total Job Value', value: formatCurrency(jobs.filter(j => j.status !== 'cancelled').reduce((s,j) => s + (j.value ?? 0), 0)) },
              { label: 'Revenue (Paid)', value: formatCurrency(invoices.filter(i => i.status === 'paid').reduce((s,i) => s + i.total_amount, 0)) },
              { label: 'Active Subcons', value: String(subcontractors.filter(s => s.active).length) },
              { label: 'Plant Items', value: String(plant.length) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-baseline py-2" style={{ borderBottom: '1px solid #1c1c1c' }}>
                <span className="text-xs" style={{ color: '#666666', fontFamily: "'DM Mono', monospace" }}>{label}</span>
                <span className="text-sm font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#FFD600' }}>{value}</span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}

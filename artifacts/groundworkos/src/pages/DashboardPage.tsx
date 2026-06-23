import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Panel } from '../components/ui/Panel';
import { Btn } from '../components/ui/Btn';
import { formatCurrency, formatDate } from '../lib/utils';
import { useApp } from '../store/AppContext';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2.5 rounded-lg text-xs" style={{ backgroundColor: '#f5f1ec', border: '1px solid #d9d4ce' }}>
      <div className="font-medium mb-1.5" style={{ color: '#181410', fontFamily: "'Inter', sans-serif" }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span style={{ color: '#7a7469' }}>{p.name}: </span>
          <span style={{ color: '#181410', fontFamily: "'JetBrains Mono', monospace" }}>{typeof p.value === 'number' ? formatCurrency(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function DashboardPage() {
  const { state } = useApp();
  const { jobs, invoices, documents } = state;

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
          <div key={label} className="p-5 rounded-lg" style={{ backgroundColor: '#fafaf8', border: '1px solid #d9d4ce' }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#7a7469', letterSpacing: '0.08em' }}>{label}</p>
            <p className="text-3xl font-bold leading-none mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", color: isDanger && totalOverdue > 0 ? '#c13a2a' : '#181410' }}>{value}</p>
            <p className="text-xs" style={{ color: '#7a7469' }}>{sub}</p>
          </div>
        ))}
      </div>

      <Panel title="Revenue vs Collected — Last 6 Months" actions={
        <Link href="/reports"><Btn variant="ghost" size="sm">Reports <ArrowRight className="w-3 h-3" /></Btn></Link>
      }>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} barGap={4} barCategoryGap="32%">
                  <CartesianGrid vertical={false} stroke="#e8e4dd" />
                  <XAxis dataKey="month" tick={{ fill: '#7a7469', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#7a7469', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '' : `£${(v / 1000).toFixed(0)}k`} width={38} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar dataKey="invoiced" name="Invoiced" fill="#d4cfc9" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="collected" name="Collected" fill="#2a6e45" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-5 mt-3">
              <div className="flex items-center gap-1.5 text-xs" style={{ color: '#7a7469' }}>
                <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: '#e0dbd5' }} /> Invoiced
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: '#7a7469' }}>
                <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: '#2a6e45' }} /> Collected
              </div>
            </div>
          </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Panel title="Active Jobs" actions={<Link href="/jobs"><Btn variant="ghost" size="sm">All jobs <ArrowRight className="w-3 h-3" /></Btn></Link>} noPad>
            {activeJobs.length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: '#c0bab4' }}>No active jobs</p>
            ) : activeJobs.slice(0, 5).map((job, i) => (
              <Link key={job.id} href="/jobs">
                <div className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[#eeeae4] cursor-pointer" style={{ borderBottom: i < Math.min(activeJobs.length, 5) - 1 ? '1px solid #d9d4ce' : 'none' }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate mb-0.5" style={{ color: '#181410' }}>{job.title}</div>
                    <div className="text-xs" style={{ color: '#7a7469' }}>{job.client?.company_name ?? '—'}</div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="w-28 hidden sm:block">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs" style={{ color: '#7a7469', fontFamily: "'JetBrains Mono', monospace" }}>{job.progress_percent}%</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#e8e4dd' }}>
                        <div className="h-full rounded-full" style={{ width: `${job.progress_percent}%`, backgroundColor: '#2a6e45' }} />
                      </div>
                    </div>
                    <span className="text-sm font-medium hidden md:block" style={{ color: '#181410', fontFamily: "'JetBrains Mono', monospace" }}>{job.value ? formatCurrency(job.value) : '—'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </Panel>
        </div>

        <Panel title="Alerts">
          <div className="space-y-3">
            {!hasAlerts && (
              <p className="text-xs text-center py-2" style={{ color: '#c0bab4' }}>All clear</p>
            )}
            {overdueInvoices.slice(0, 3).map(inv => (
              <Link key={inv.id} href="/invoices">
                <div className="flex items-start gap-2.5 cursor-pointer group">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#c13a2a' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium group-hover:text-white transition-colors" style={{ color: '#181410' }}>{inv.invoice_number}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#7a7469' }}>{formatCurrency(inv.total_amount)} overdue</div>
                  </div>
                </div>
              </Link>
            ))}
            {[...expiredDocs, ...expiringDocs].slice(0, 3).map(doc => (
              <Link key={doc.id} href="/documents">
                <div className="flex items-start gap-2.5 cursor-pointer group">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: doc.status === 'expired' ? '#c13a2a' : '#e07b39' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium group-hover:text-white transition-colors truncate" style={{ color: '#181410' }}>{doc.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#7a7469' }}>
                      {doc.status === 'expired' ? 'Expired' : 'Expiring'} {formatDate(doc.expiry_date)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

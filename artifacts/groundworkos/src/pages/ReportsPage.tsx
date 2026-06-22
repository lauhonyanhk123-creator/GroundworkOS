import { useState } from 'react';
import { Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend,
} from 'recharts';
import { Panel } from '../components/ui/Panel';
import { Btn } from '../components/ui/Btn';
import { formatCurrency, formatDate } from '../lib/utils';
import { RATE_BOOK } from '../data/mock';
import { useApp } from '../store/AppContext';

type ReportTab = 'overview' | 'cis' | 'ratebook';

const YELLOW = '#FFD600';
const RED = '#ff4444';
const GREEN = '#4ade80';
const ORANGE = '#fb923c';
const BLUE = '#60a5fa';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded text-xs" style={{ backgroundColor: '#1c1c1c', border: '1px solid #3a3a3a', fontFamily: "'DM Mono', monospace" }}>
      <div className="font-bold mb-1" style={{ color: '#e8e8e8' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span style={{ color: '#888888' }}>{p.name}: </span>
          <span style={{ color: '#e8e8e8' }}>{typeof p.value === 'number' && p.value > 100 ? formatCurrency(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function ReportsPage() {
  const { state } = useApp();
  const { invoices, jobs, cisReturns } = state;

  const [tab, setTab] = useState<ReportTab>('overview');
  const [rateCategory, setRateCategory] = useState('all');

  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const totalRevenue = paidInvoices.reduce((s, i) => s + i.total_amount, 0);
  const totalOutstanding = invoices.filter(i => i.status !== 'paid' && i.status !== 'credited').reduce((s, i) => s + i.total_amount, 0);
  const totalPipeline = jobs.filter(j => j.status !== 'cancelled').reduce((s, j) => s + (j.value ?? 0), 0);
  const overdueTotal = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total_amount, 0);

  const monthMap = new Map<string, { invoiced: number; collected: number; month: string }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(key, { invoiced: 0, collected: 0, month: d.toLocaleDateString('en-GB', { month: 'short' }) });
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

  let cumulative = 0;
  const cumulativeData = revenueData.map(d => {
    cumulative += d.collected;
    return { ...d, cumulative };
  });

  const pipelineByStatus = [
    { label: 'Active', status: 'active', color: GREEN },
    { label: 'Quoted', status: 'quoted', color: YELLOW },
    { label: 'Complete', status: 'complete', color: BLUE },
    { label: 'On Hold', status: 'on_hold', color: ORANGE },
  ].map(({ label, status, color }) => {
    const pJobs = jobs.filter(j => j.status === status);
    return { label, color, count: pJobs.length, value: pJobs.reduce((s, j) => s + (j.value ?? 0), 0) };
  });

  const jobTypeData = Object.entries(
    jobs.reduce((acc, j) => {
      if (!j.type) return acc;
      acc[j.type] = (acc[j.type] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: count }))
   .sort((a, b) => b.value - a.value);

  const TYPE_COLORS = ['#60a5fa', '#fb923c', '#4ade80', '#FFD600', '#a78bfa', '#f472b6', '#34d399', '#fbbf24'];

  const agingBuckets = [
    { label: '0–30 days', invoices: invoices.filter(i => (i.status === 'sent' || i.status === 'overdue') && daysOld(i.due_date) <= 30) },
    { label: '31–60 days', invoices: invoices.filter(i => (i.status === 'sent' || i.status === 'overdue') && daysOld(i.due_date) > 30 && daysOld(i.due_date) <= 60) },
    { label: '61–90 days', invoices: invoices.filter(i => (i.status === 'sent' || i.status === 'overdue') && daysOld(i.due_date) > 60 && daysOld(i.due_date) <= 90) },
    { label: '90+ days', invoices: invoices.filter(i => (i.status === 'sent' || i.status === 'overdue') && daysOld(i.due_date) > 90) },
  ].map(b => ({ label: b.label, value: b.invoices.reduce((s, i) => s + i.total_amount, 0), count: b.invoices.length }));

  const cisPending = cisReturns.filter(r => !r.submitted);
  const cisTotalDeductions = cisReturns.filter(r => r.submitted).reduce((s, r) => s + r.deduction_amount, 0);
  const rateCategories = ['all', ...Array.from(new Set(RATE_BOOK.map(r => r.category)))];
  const filteredRates = RATE_BOOK.filter(r => rateCategory === 'all' || r.category === rateCategory);
  const taxMonths = [...new Set(cisReturns.map(r => r.tax_month))].sort().reverse();

  const collectionRate = totalRevenue + totalOutstanding > 0 ? Math.round((totalRevenue / (totalRevenue + totalOutstanding)) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Reports</h1>
          <p className="text-sm mt-0.5" style={{ color: '#666666' }}>Financial reports, CIS returns & rate book</p>
        </div>
        <Btn variant="outline" size="sm"><Download className="w-3.5 h-3.5" /> Export</Btn>
      </div>

      <div className="flex items-center gap-1 p-0.5 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
        {([
          { id: 'overview', label: 'Overview' },
          { id: 'cis', label: 'CIS Return' },
          { id: 'ratebook', label: 'Rate Book' },
        ] as { id: ReportTab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="px-4 py-1.5 rounded text-sm transition-colors" style={tab === t.id ? { backgroundColor: YELLOW, color: '#0c0c0c', fontWeight: 700 } : { color: '#666666' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Revenue Collected', value: formatCurrency(totalRevenue), color: GREEN, sub: `${paidInvoices.length} invoices paid` },
              { label: 'Outstanding', value: formatCurrency(totalOutstanding), color: YELLOW, sub: `${invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length} unpaid` },
              { label: 'Overdue', value: formatCurrency(overdueTotal), color: overdueTotal > 0 ? RED : '#555555', sub: `${invoices.filter(i => i.status === 'overdue').length} invoices` },
              { label: 'Collection Rate', value: `${collectionRate}%`, color: collectionRate >= 70 ? GREEN : collectionRate >= 40 ? YELLOW : RED, sub: `of total invoiced` },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="p-4 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
                <div className="text-xs font-mono uppercase tracking-wider mb-2" style={{ color: '#555555' }}>{label}</div>
                <div className="text-3xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{value}</div>
                <div className="text-xs font-mono mt-1" style={{ color: '#555555' }}>{sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Panel title="Revenue vs Invoiced — Last 6 Months">
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData} barGap={4} barCategoryGap="35%">
                      <CartesianGrid vertical={false} stroke="#1e1e1e" />
                      <XAxis dataKey="month" tick={{ fill: '#555555', fontSize: 11, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#555555', fontSize: 10, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '' : `£${(v / 1000).toFixed(0)}k`} width={42} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Bar dataKey="invoiced" name="Invoiced" fill={YELLOW} fillOpacity={0.35} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="collected" name="Collected" fill={GREEN} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: '#666666' }}>
                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: YELLOW, opacity: 0.4 }} /> Invoiced
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: '#666666' }}>
                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: GREEN }} /> Collected
                  </div>
                </div>
              </Panel>
            </div>

            <Panel title="Jobs by Type">
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={jobTypeData} cx="50%" cy="45%" outerRadius={75} paddingAngle={2} dataKey="value" label={({ name, percent }) => percent > 0.08 ? `${name}` : ''} labelLine={false} fontSize={10}>
                      {jobTypeData.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                {jobTypeData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs font-mono">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                    <span style={{ color: '#666666' }}>{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Cumulative Revenue">
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulativeData}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={GREEN} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#1e1e1e" />
                    <XAxis dataKey="month" tick={{ fill: '#555555', fontSize: 11, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#555555', fontSize: 10, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '' : `£${(v / 1000).toFixed(0)}k`} width={42} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3a3a3a' }} />
                    <Area type="monotone" dataKey="cumulative" name="Cumulative" stroke={GREEN} strokeWidth={2} fill="url(#revGrad)" dot={{ fill: GREEN, r: 3, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Aged Debtors">
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingBuckets} barCategoryGap="35%">
                    <CartesianGrid vertical={false} stroke="#1e1e1e" />
                    <XAxis dataKey="label" tick={{ fill: '#555555', fontSize: 10, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#555555', fontSize: 10, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '' : `£${(v / 1000).toFixed(0)}k`} width={42} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="value" name="Outstanding" radius={[2, 2, 0, 0]}>
                      {agingBuckets.map((_, i) => <Cell key={i} fill={[GREEN, YELLOW, ORANGE, RED][i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {agingBuckets.map((b, i) => (
                  <div key={b.label} className="text-center">
                    <div className="text-xs font-mono" style={{ color: '#555555' }}>{b.label}</div>
                    <div className="text-sm font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: [GREEN, YELLOW, ORANGE, RED][i] }}>{b.count > 0 ? formatCurrency(b.value) : '—'}</div>
                    <div className="text-xs font-mono" style={{ color: '#444444' }}>{b.count > 0 ? `${b.count} inv` : ''}</div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel title="Pipeline by Status">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {pipelineByStatus.map(({ label, color, count, value }) => {
                const pct = totalPipeline > 0 ? Math.round((value / totalPipeline) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-xs font-mono uppercase" style={{ color: '#666666' }}>{label}</span>
                    </div>
                    <div className="text-3xl font-bold mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{formatCurrency(value)}</div>
                    <div className="text-xs font-mono mb-2" style={{ color: '#555555' }}>{count} jobs · {pct}% of pipeline</div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#1c1c1c' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </>
      )}

      {tab === 'cis' && (
        <>
          <div className="p-4 rounded" style={{ backgroundColor: '#1a1400', border: '1px solid rgba(255,214,0,0.3)' }}>
            <div className="text-xs font-mono uppercase font-bold mb-1" style={{ color: YELLOW }}>Construction Industry Scheme (CIS)</div>
            <p className="text-xs" style={{ color: '#888888' }}>Monthly returns must be filed with HMRC by the 19th of the following tax month. Deductions must be made from subcontractors verified as "net" or "unverified".</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Deductions Filed', value: formatCurrency(cisTotalDeductions), color: GREEN },
              { label: 'Pending Submission', value: String(cisPending.length), color: cisPending.length > 0 ? ORANGE : '#555555' },
              { label: 'Pending Deductions', value: formatCurrency(cisPending.reduce((s, r) => s + r.deduction_amount, 0)), color: cisPending.length > 0 ? RED : '#555555' },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-4 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
                <div className="text-xs font-mono uppercase tracking-wider mb-2" style={{ color: '#555555' }}>{label}</div>
                <div className="text-3xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{value}</div>
              </div>
            ))}
          </div>

          {taxMonths.map(month => {
            const monthReturns = cisReturns.filter(r => r.tax_month === month);
            if (monthReturns.length === 0) return null;
            const submitted = monthReturns.every(r => r.submitted);
            return (
              <Panel key={month} title={`Tax Month: ${new Date(month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`} actions={
                submitted
                  ? <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: '#0d1f0d', color: GREEN, border: '1px solid rgba(74,222,128,0.3)' }}>SUBMITTED</span>
                  : <Btn size="sm">Submit Return</Btn>
              }>
                <div className="overflow-x-auto">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                        {['Subcontractor', 'UTR', 'Rate', 'Gross', 'Deduction', 'Net'].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#444444' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthReturns.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #1c1c1c' }}>
                          <td className="py-2 px-3 text-sm" style={{ color: '#e8e8e8' }}>{r.subcontractor_name}</td>
                          <td className="py-2 px-3 text-sm font-mono" style={{ color: '#555555' }}>—</td>
                          <td className="py-2 px-3 text-sm font-mono" style={{ color: YELLOW }}>{r.deduction_rate}%</td>
                          <td className="py-2 px-3 text-sm font-mono" style={{ color: '#888888' }}>{formatCurrency(r.gross_payment)}</td>
                          <td className="py-2 px-3 text-sm font-mono font-bold" style={{ color: RED }}>-{formatCurrency(r.deduction_amount)}</td>
                          <td className="py-2 px-3 text-sm font-mono font-bold" style={{ color: GREEN }}>{formatCurrency(r.net_payment)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #2a2a2a' }}>
                        <td colSpan={3} className="py-2 px-3 text-xs font-mono uppercase" style={{ color: '#555555' }}>Total</td>
                        <td className="py-2 px-3 text-sm font-mono font-bold" style={{ color: '#888888' }}>{formatCurrency(monthReturns.reduce((s, r) => s + r.gross_payment, 0))}</td>
                        <td className="py-2 px-3 text-sm font-mono font-bold" style={{ color: RED }}>-{formatCurrency(monthReturns.reduce((s, r) => s + r.deduction_amount, 0))}</td>
                        <td className="py-2 px-3 text-sm font-mono font-bold" style={{ color: GREEN }}>{formatCurrency(monthReturns.reduce((s, r) => s + r.net_payment, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Panel>
            );
          })}
        </>
      )}

      {tab === 'ratebook' && (
        <>
          <div className="flex items-center gap-3">
            <select value={rateCategory} onChange={e => setRateCategory(e.target.value)} className="py-1.5 px-3 rounded text-sm focus:outline-none" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a', color: '#888888', fontFamily: "'DM Mono', monospace" }}>
              {rateCategories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
            </select>
            <span className="text-xs font-mono" style={{ color: '#444444' }}>{filteredRates.length} rates</span>
          </div>

          {rateCategories.filter(c => c !== 'all').map(cat => {
            const catRates = filteredRates.filter(r => r.category === cat);
            if (catRates.length === 0) return null;
            const avgTotal = catRates.reduce((s, r) => s + r.total_rate, 0) / catRates.length;
            return (
              <Panel key={cat} title={cat} actions={<span className="text-xs font-mono" style={{ color: '#555555' }}>avg £{avgTotal.toFixed(2)}/unit</span>}>
                <div className="overflow-x-auto">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                        {['Description', 'Unit', 'Labour', 'Material', 'Plant', 'Total'].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#444444' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {catRates.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #1c1c1c' }} className="hover:bg-[#1c1c1c] transition-colors">
                          <td className="py-2 px-3 text-sm" style={{ color: '#e8e8e8' }}>
                            {r.description}
                            {r.notes && <div className="text-xs mt-0.5" style={{ color: '#444444' }}>{r.notes}</div>}
                          </td>
                          <td className="py-2 px-3 text-sm font-mono" style={{ color: '#666666' }}>{r.unit}</td>
                          <td className="py-2 px-3 text-sm font-mono" style={{ color: '#888888' }}>£{r.labour_rate.toFixed(2)}</td>
                          <td className="py-2 px-3 text-sm font-mono" style={{ color: '#888888' }}>£{r.material_rate.toFixed(2)}</td>
                          <td className="py-2 px-3 text-sm font-mono" style={{ color: '#888888' }}>£{r.plant_rate.toFixed(2)}</td>
                          <td className="py-2 px-3 text-sm font-mono font-bold" style={{ color: YELLOW }}>£{r.total_rate.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            );
          })}
        </>
      )}
    </div>
  );
}

function daysOld(dateStr: string | null): number {
  if (!dateStr) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000));
}

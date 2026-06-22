import { useState } from 'react';
import { Panel } from '../components/ui/Panel';
import { StatCard } from '../components/ui/StatCard';
import { Btn } from '../components/ui/Btn';
import { formatCurrency, formatDate } from '../lib/utils';
import { RATE_BOOK } from '../data/mock';
import { useApp } from '../store/AppContext';

type ReportTab = 'overview' | 'cis' | 'ratebook';

export function ReportsPage() {
  const { state, dispatch } = useApp();
  const { invoices, jobs, cisReturns } = state;

  const [tab, setTab] = useState<ReportTab>('overview');
  const [rateCategory, setRateCategory] = useState('all');

  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const totalRevenue = paidInvoices.reduce((s, i) => s + i.total_amount, 0);
  const totalOutstanding = invoices.filter(i => i.status !== 'paid' && i.status !== 'credited').reduce((s, i) => s + i.total_amount, 0);
  const totalPipeline = jobs.filter(j => j.status !== 'cancelled').reduce((s, j) => s + (j.value ?? 0), 0);
  const totalJobs = jobs.length;

  const monthMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    monthMap.set(key, 0);
  }
  for (const inv of paidInvoices) {
    if (!inv.paid_at) continue;
    const d = new Date(inv.paid_at);
    const key = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    if (monthMap.has(key)) monthMap.set(key, (monthMap.get(key) ?? 0) + inv.total_amount);
  }
  const revenueData = Array.from(monthMap.entries()).map(([month, total]) => ({ month: month.split(' ')[0], total }));
  const maxRevenue = Math.max(...revenueData.map(d => d.total), 1);

  const pipelineByStatus = [
    { label: 'Active', status: 'active', color: '#FFD600' },
    { label: 'Quoted', status: 'quoted', color: '#fb923c' },
    { label: 'Complete', status: 'complete', color: '#4ade80' },
  ].map(({ label, status, color }) => {
    const pJobs = jobs.filter(j => j.status === status);
    return { label, color, count: pJobs.length, value: pJobs.reduce((s, j) => s + (j.value ?? 0), 0) };
  });

  const cisPending = cisReturns.filter(r => !r.submitted);
  const cisTotalDeductions = cisReturns.filter(r => r.submitted).reduce((s, r) => s + r.deduction_amount, 0);

  const rateCategories = ['all', ...Array.from(new Set(RATE_BOOK.map(r => r.category)))];
  const filteredRates = RATE_BOOK.filter(r => rateCategory === 'all' || r.category === rateCategory);

  function submitReturn(taxMonth: string) {
    cisReturns
      .filter(r => r.tax_month === taxMonth && !r.submitted)
      .forEach(r => {
        dispatch({
          type: 'UPDATE_INVOICE',
          id: r.id,
          updates: {},
        });
      });
  }

  const taxMonths = [...new Set(cisReturns.map(r => r.tax_month))].sort().reverse();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Reports</h1>
          <p className="text-sm mt-0.5" style={{ color: '#666666' }}>Financial reports, CIS returns & rate book</p>
        </div>
        <Btn variant="outline" size="sm">Export</Btn>
      </div>

      <div className="flex items-center gap-1 p-0.5 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
        {([
          { id: 'overview', label: 'Overview' },
          { id: 'cis', label: 'CIS Return' },
          { id: 'ratebook', label: 'Rate Book' },
        ] as { id: ReportTab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="px-4 py-1.5 rounded text-sm transition-colors" style={tab === t.id ? { backgroundColor: '#FFD600', color: '#0c0c0c', fontWeight: 700 } : { color: '#666666' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Revenue (All)" value={formatCurrency(totalRevenue)} barPercent={80} />
            <StatCard label="Outstanding" value={formatCurrency(totalOutstanding)} barPercent={45} />
            <StatCard label="Pipeline Value" value={formatCurrency(totalPipeline)} barPercent={65} />
            <StatCard label="Total Jobs" value={totalJobs} barPercent={50} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Panel title="Revenue (Last 6 Months)">
              <div className="flex items-end justify-between gap-2 h-48">
                {revenueData.map((d, i) => {
                  const heightPct = maxRevenue > 0 ? (d.total / maxRevenue) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-xs font-mono" style={{ color: '#444444' }}>{d.total > 0 ? formatCurrency(d.total) : ''}</div>
                      <div className="w-full relative" style={{ height: '140px', backgroundColor: '#1c1c1c', borderRadius: '2px' }}>
                        <div className="absolute bottom-0 left-0 right-0 rounded-t transition-all duration-500" style={{ height: `${heightPct}%`, backgroundColor: '#FFD600' }} />
                      </div>
                      <div className="text-xs font-mono" style={{ color: '#666666' }}>{d.month}</div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Pipeline Summary">
              <div className="space-y-3">
                {pipelineByStatus.map(({ label, color, count, value }) => {
                  const pct = totalPipeline > 0 ? (value / totalPipeline) * 100 : 0;
                  return (
                    <div key={label}>
                      <div className="flex justify-between items-baseline mb-1.5">
                        <span className="text-sm font-medium" style={{ color: '#e8e8e8' }}>{label} <span className="text-xs font-mono" style={{ color: '#444444' }}>({count} jobs)</span></span>
                        <span className="text-lg font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{formatCurrency(value)}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#242424' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-3 flex justify-between items-baseline" style={{ borderTop: '1px solid #2a2a2a' }}>
                  <span className="text-sm font-mono" style={{ color: '#666666' }}>Total Pipeline</span>
                  <span className="text-2xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#FFD600' }}>{formatCurrency(totalPipeline)}</span>
                </div>
              </div>
            </Panel>
          </div>

          <Panel title="Aged Debtors">
            {invoices.filter(i => i.status === 'overdue' || i.status === 'sent').length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: '#444444' }}>No outstanding invoices</p>
            ) : (
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                      {['Client', 'Invoice #', 'Issued', 'Due Date', 'Status', 'Amount'].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#444444' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.filter(i => i.status === 'overdue' || i.status === 'sent').map(inv => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #1c1c1c' }} className="hover:bg-[#1c1c1c] transition-colors">
                        <td className="py-2 px-3 text-sm" style={{ color: '#e8e8e8' }}>{inv.client?.company_name}</td>
                        <td className="py-2 px-3 text-sm font-mono" style={{ color: '#666666' }}>{inv.invoice_number}</td>
                        <td className="py-2 px-3 text-sm font-mono" style={{ color: '#666666' }}>{formatDate(inv.issued_date)}</td>
                        <td className="py-2 px-3 text-sm font-mono" style={{ color: inv.status === 'overdue' ? '#ff4444' : '#666666' }}>{formatDate(inv.due_date)}</td>
                        <td className="py-2 px-3"><span className="text-xs font-mono uppercase" style={{ color: inv.status === 'overdue' ? '#ff4444' : '#FFD600' }}>{inv.status}</span></td>
                        <td className="py-2 px-3 text-sm font-mono text-right font-bold" style={{ color: '#e8e8e8' }}>{formatCurrency(inv.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}

      {tab === 'cis' && (
        <>
          <div className="p-4 rounded" style={{ backgroundColor: '#1a1400', border: '1px solid rgba(255,214,0,0.3)' }}>
            <div className="text-xs font-mono uppercase font-bold mb-1" style={{ color: '#FFD600' }}>Construction Industry Scheme (CIS)</div>
            <p className="text-xs" style={{ color: '#888888' }}>
              Monthly returns must be filed with HMRC by the 19th of the following tax month. Deductions must be made from subcontractors verified as "net" or "unverified".
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Deductions (Filed)', value: formatCurrency(cisTotalDeductions) },
              { label: 'Pending Submission', value: cisPending.length },
              { label: 'Pending Deductions', value: formatCurrency(cisPending.reduce((s, r) => s + r.deduction_amount, 0)) },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
                <div className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: '#444444' }}>{label}</div>
                <div className="text-2xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#FFD600' }}>{value}</div>
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
                  ? <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: '#0d1f0d', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>SUBMITTED</span>
                  : <Btn size="sm" onClick={() => submitReturn(month)}>Submit Return</Btn>
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
                          <td className="py-2 px-3 text-sm font-mono" style={{ color: '#666666' }}>—</td>
                          <td className="py-2 px-3 text-sm font-mono" style={{ color: '#FFD600' }}>{r.deduction_rate}%</td>
                          <td className="py-2 px-3 text-sm font-mono" style={{ color: '#888888' }}>{formatCurrency(r.gross_payment)}</td>
                          <td className="py-2 px-3 text-sm font-mono font-bold" style={{ color: '#ff4444' }}>-{formatCurrency(r.deduction_amount)}</td>
                          <td className="py-2 px-3 text-sm font-mono font-bold" style={{ color: '#4ade80' }}>{formatCurrency(r.net_payment)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #2a2a2a' }}>
                        <td colSpan={3} className="py-2 px-3 text-xs font-mono uppercase" style={{ color: '#666666' }}>Total</td>
                        <td className="py-2 px-3 text-sm font-mono font-bold" style={{ color: '#888888' }}>{formatCurrency(monthReturns.reduce((s,r) => s + r.gross_payment, 0))}</td>
                        <td className="py-2 px-3 text-sm font-mono font-bold" style={{ color: '#ff4444' }}>-{formatCurrency(monthReturns.reduce((s,r) => s + r.deduction_amount, 0))}</td>
                        <td className="py-2 px-3 text-sm font-mono font-bold" style={{ color: '#4ade80' }}>{formatCurrency(monthReturns.reduce((s,r) => s + r.net_payment, 0))}</td>
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
            return (
              <Panel key={cat} title={cat}>
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
                          <td className="py-2 px-3 text-sm font-mono font-bold" style={{ color: '#FFD600' }}>£{r.total_rate.toFixed(2)}</td>
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

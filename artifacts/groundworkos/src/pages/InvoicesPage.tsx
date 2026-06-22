import { useState } from 'react';
import { Plus, Download, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { Btn } from '../components/ui/Btn';
import { Modal, Field, Input, Select, Textarea } from '../components/ui/Modal';
import { cn, formatCurrency, formatDate, daysOverdue } from '../lib/utils';
import { useApp, nextInvoiceNumber } from '../store/AppContext';

const YELLOW = '#FFD600';
const GREEN = '#4ade80';
const RED = '#ff4444';
const ORANGE = '#fb923c';
const BLUE = '#60a5fa';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'paid', label: 'Paid' },
];

const emptyForm = {
  client_id: '', job_id: '', subtotal: '', notes: '',
  issued_date: new Date().toISOString().split('T')[0],
  due_date: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; })(),
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-2.5 py-1.5 rounded text-xs" style={{ backgroundColor: '#1c1c1c', border: '1px solid #3a3a3a', fontFamily: "'DM Mono', monospace" }}>
      <div style={{ color: '#888888' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</div>
      ))}
    </div>
  );
};

export function InvoicesPage() {
  const { state, dispatch } = useApp();
  const { invoices, clients, jobs } = state;

  const [tab, setTab] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = invoices.filter(i => tab === 'all' || i.status === tab);
  const totalOutstanding = invoices.filter(i => i.status !== 'paid' && i.status !== 'credited').reduce((s, i) => s + i.total_amount, 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0);
  const overdueTotal = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total_amount, 0);
  const sentTotal = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.total_amount, 0);
  const selectedInv = selected ? invoices.find(i => i.id === selected) : null;
  const collectionRate = totalPaid + totalOutstanding > 0 ? Math.round((totalPaid / (totalPaid + totalOutstanding)) * 100) : 0;

  const subtotal = parseFloat(form.subtotal) || 0;
  const vatAmount = Math.round(subtotal * 0.2 * 100) / 100;
  const total = subtotal + vatAmount;

  const agingData = [
    { label: '0–30d', value: invoices.filter(i => (i.status === 'sent' || i.status === 'overdue') && daysOld(i.due_date) <= 30).reduce((s, i) => s + i.total_amount, 0), color: GREEN },
    { label: '31–60d', value: invoices.filter(i => (i.status === 'sent' || i.status === 'overdue') && daysOld(i.due_date) > 30 && daysOld(i.due_date) <= 60).reduce((s, i) => s + i.total_amount, 0), color: YELLOW },
    { label: '61–90d', value: invoices.filter(i => (i.status === 'sent' || i.status === 'overdue') && daysOld(i.due_date) > 60 && daysOld(i.due_date) <= 90).reduce((s, i) => s + i.total_amount, 0), color: ORANGE },
    { label: '90+d', value: invoices.filter(i => (i.status === 'sent' || i.status === 'overdue') && daysOld(i.due_date) > 90).reduce((s, i) => s + i.total_amount, 0), color: RED },
  ];

  function openNew() {
    setForm(emptyForm);
    setErrors({});
    setShowModal(true);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.client_id) e.client_id = 'Client is required';
    if (!form.subtotal || parseFloat(form.subtotal) <= 0) e.subtotal = 'Amount must be greater than 0';
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const client = clients.find(c => c.id === form.client_id);
    const job = jobs.find(j => j.id === form.job_id);
    dispatch({
      type: 'ADD_INVOICE',
      invoice: {
        id: crypto.randomUUID(),
        invoice_number: nextInvoiceNumber(invoices),
        client_id: form.client_id,
        client: client ? { company_name: client.company_name } : null,
        job_id: form.job_id || null,
        job: job ? { title: job.title } : null,
        quote_id: null,
        subtotal,
        vat_amount: vatAmount,
        total_amount: total,
        status: 'draft',
        issued_date: form.issued_date,
        due_date: form.due_date,
        paid_at: null,
        notes: form.notes || null,
        created_at: new Date().toISOString(),
        cis_deduction: null,
      },
    });
    setShowModal(false);
  }

  function markPaid(id: string) {
    dispatch({ type: 'UPDATE_INVOICE', id, updates: { status: 'paid', paid_at: new Date().toISOString() } });
  }

  function markSent(id: string) {
    dispatch({ type: 'UPDATE_INVOICE', id, updates: { status: 'sent' } });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Invoices</h1>
          <p className="text-sm mt-0.5" style={{ color: '#666666' }}>Track payments and outstanding amounts</p>
        </div>
        <Btn onClick={openNew}><Plus className="w-4 h-4" /> New Invoice</Btn>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Outstanding', value: formatCurrency(totalOutstanding), sub: `${invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length} invoices`, color: YELLOW, icon: <Clock className="w-4 h-4" /> },
          { label: 'Overdue', value: formatCurrency(overdueTotal), sub: `${invoices.filter(i => i.status === 'overdue').length} overdue`, color: overdueTotal > 0 ? RED : '#555555', icon: <AlertCircle className="w-4 h-4" /> },
          { label: 'Collected', value: formatCurrency(totalPaid), sub: `${invoices.filter(i => i.status === 'paid').length} paid`, color: GREEN, icon: <CheckCircle className="w-4 h-4" /> },
          { label: 'Collection Rate', value: `${collectionRate}%`, sub: 'of total invoiced', color: collectionRate >= 70 ? GREEN : collectionRate >= 40 ? YELLOW : RED, icon: <TrendingUp className="w-4 h-4" /> },
        ].map(({ label, value, sub, color, icon }) => (
          <div key={label} className="p-3 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#555555' }}>{label}</span>
              <span style={{ color, opacity: 0.6 }}>{icon}</span>
            </div>
            <div className="text-2xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{value}</div>
            <div className="text-xs font-mono mt-0.5" style={{ color: '#555555' }}>{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Panel title="Cash Position">
            <div className="flex items-end gap-4 mb-3">
              {[
                { label: 'Paid', value: totalPaid, color: GREEN },
                { label: 'Awaiting', value: sentTotal, color: YELLOW },
                { label: 'Overdue', value: overdueTotal, color: RED },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex-1 text-center">
                  <div className="text-xs font-mono mb-1" style={{ color: '#555555' }}>{label}</div>
                  <div className="text-xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{formatCurrency(value)}</div>
                </div>
              ))}
            </div>
            <div className="flex h-2 rounded-full overflow-hidden">
              {(() => {
                const t = totalPaid + sentTotal + overdueTotal || 1;
                return [
                  { v: totalPaid, c: GREEN },
                  { v: sentTotal, c: YELLOW },
                  { v: overdueTotal, c: RED },
                ].map(({ v, c }, i) => v > 0 ? <div key={i} style={{ width: `${(v / t) * 100}%`, backgroundColor: c }} /> : null);
              })()}
            </div>
          </Panel>
        </div>

        <Panel title="Aged Debt">
          <div style={{ height: 110 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingData} barCategoryGap="30%">
                <XAxis dataKey="label" tick={{ fill: '#555555', fontSize: 10, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#555555', fontSize: 10, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '' : `£${(v / 1000).toFixed(0)}k`} width={35} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="value" name="Outstanding" radius={[2, 2, 0, 0]}>
                  {agingData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="flex items-center gap-1 p-1 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="px-4 py-1.5 rounded text-sm transition-colors" style={tab === t.id ? { backgroundColor: YELLOW, color: '#0c0c0c', fontWeight: 700 } : { color: '#666666' }}>
            {t.label}{t.id !== 'all' && <span className="text-xs opacity-60 ml-1">({invoices.filter(i => i.status === t.id).length})</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={selectedInv ? 'xl:col-span-2' : 'xl:col-span-3'}>
          <Panel>
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-sm" style={{ color: '#444444' }}>No invoices</p>
            ) : (
              <div className="space-y-2">
                {filtered.map(inv => {
                  const overdueDays = inv.status === 'overdue' ? daysOverdue(inv.due_date) : 0;
                  return (
                    <div key={inv.id} onClick={() => setSelected(selected === inv.id ? null : inv.id)} className={cn('flex items-center gap-3 p-3 rounded cursor-pointer transition-colors', selected === inv.id ? 'ring-1 ring-[#FFD600]' : 'hover:bg-[#242424]')} style={{ backgroundColor: '#1c1c1c' }}>
                      <span className="text-xs font-mono w-28 flex-shrink-0" style={{ color: '#444444' }}>{inv.invoice_number}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: '#e8e8e8' }}>{inv.client?.company_name ?? '—'}</div>
                        <div className="text-xs truncate" style={{ color: '#444444' }}>{inv.job?.title ?? '—'}</div>
                      </div>
                      <Badge status={inv.status} />
                      {overdueDays > 0 && <span className="text-xs font-mono" style={{ color: RED }}>{overdueDays}d late</span>}
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#e8e8e8' }}>{formatCurrency(inv.total_amount)}</div>
                        <div className="text-xs" style={{ color: '#444444', fontFamily: "'DM Mono', monospace" }}>Due {formatDate(inv.due_date)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {selectedInv && (
          <div>
            <Panel title={selectedInv.invoice_number} actions={<button onClick={() => setSelected(null)} className="text-xs font-mono" style={{ color: '#666666' }}>✕</button>}>
              <div className="space-y-4">
                <div><Badge status={selectedInv.status} /></div>

                {[
                  { label: 'Client', value: selectedInv.client?.company_name ?? '—' },
                  { label: 'Job', value: selectedInv.job?.title ?? '—' },
                  { label: 'Issued', value: formatDate(selectedInv.issued_date) },
                  { label: 'Due Date', value: formatDate(selectedInv.due_date) },
                  { label: 'Paid', value: selectedInv.paid_at ? formatDate(selectedInv.paid_at) : '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-xs font-mono uppercase tracking-wider" style={{ color: '#444444' }}>{label}</div>
                    <div className="text-sm mt-0.5 truncate" style={{ color: '#e8e8e8' }}>{value}</div>
                  </div>
                ))}

                <div className="pt-2" style={{ borderTop: '1px solid #2a2a2a' }}>
                  {[
                    { label: 'Subtotal', value: formatCurrency(selectedInv.subtotal) },
                    { label: 'VAT (20%)', value: formatCurrency(selectedInv.vat_amount) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm mb-1">
                      <span style={{ color: '#666666' }}>{label}</span>
                      <span style={{ color: '#888888', fontFamily: "'DM Mono', monospace" }}>{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold mt-2 pt-2" style={{ borderTop: '1px solid #2a2a2a' }}>
                    <span style={{ color: '#e8e8e8' }}>Total</span>
                    <span style={{ color: YELLOW, fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.25rem' }}>{formatCurrency(selectedInv.total_amount)}</span>
                  </div>
                </div>

                {selectedInv.notes && (
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: '#444444' }}>Notes</div>
                    <p className="text-xs leading-relaxed" style={{ color: '#888888' }}>{selectedInv.notes}</p>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  {selectedInv.status === 'draft' && (
                    <Btn size="sm" className="w-full justify-center" onClick={() => markSent(selectedInv.id)}>Mark as Sent</Btn>
                  )}
                  {(selectedInv.status === 'sent' || selectedInv.status === 'overdue') && (
                    <Btn size="sm" className="w-full justify-center" onClick={() => markPaid(selectedInv.id)}>✓ Mark as Paid</Btn>
                  )}
                  <Btn variant="outline" size="sm" className="w-full justify-center"><Download className="w-3 h-3" /> Download PDF</Btn>
                </div>
              </div>
            </Panel>
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Invoice">
        <div className="space-y-4">
          <Field label="Client" required>
            <Select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
              <option value="">Select client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </Select>
            {errors.client_id && <p className="mt-1 text-xs" style={{ color: RED }}>{errors.client_id}</p>}
          </Field>

          <Field label="Related Job">
            <Select value={form.job_id} onChange={e => setForm(f => ({ ...f, job_id: e.target.value }))}>
              <option value="">None</option>
              {jobs.filter(j => !form.client_id || j.client_id === form.client_id).map(j => (
                <option key={j.id} value={j.id}>{j.job_number} — {j.title}</option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Issue Date">
              <Input type="date" value={form.issued_date} onChange={e => setForm(f => ({ ...f, issued_date: e.target.value }))} />
            </Field>
            <Field label="Due Date">
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </Field>
          </div>

          <Field label="Subtotal (£ excl. VAT)" required>
            <Input type="number" value={form.subtotal} onChange={e => setForm(f => ({ ...f, subtotal: e.target.value }))} placeholder="0.00" />
            {errors.subtotal && <p className="mt-1 text-xs" style={{ color: RED }}>{errors.subtotal}</p>}
          </Field>

          {subtotal > 0 && (
            <div className="p-3 rounded space-y-1" style={{ backgroundColor: '#1c1c1c' }}>
              {[
                { label: 'Subtotal', value: formatCurrency(subtotal) },
                { label: 'VAT (20%)', value: formatCurrency(vatAmount) },
                { label: 'Total', value: formatCurrency(total) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span style={{ color: '#666666' }}>{label}</span>
                  <span className="font-mono" style={{ color: label === 'Total' ? YELLOW : '#888888', fontWeight: label === 'Total' ? 700 : 400 }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          <Field label="Notes">
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Stage 1 — drainage installation complete" rows={2} />
          </Field>

          <div className="flex gap-3 pt-2">
            <Btn className="flex-1 justify-center" onClick={handleSubmit}>Create Invoice</Btn>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function daysOld(dateStr: string | null): number {
  if (!dateStr) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000));
}

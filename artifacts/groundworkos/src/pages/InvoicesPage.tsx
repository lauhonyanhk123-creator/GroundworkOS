import { useState } from 'react';
import { Plus, Download, X, ChevronRight } from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { Btn } from '../components/ui/Btn';
import { Modal, Field, Input, Select, Textarea } from '../components/ui/Modal';
import { cn, formatCurrency, formatDate, daysOverdue } from '../lib/utils';
import { useApp, nextInvoiceNumber } from '../store/AppContext';

const RED = '#c13a2a';

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
  const selectedInv = selected ? invoices.find(i => i.id === selected) : null;
  const collectionRate = totalPaid + totalOutstanding > 0 ? Math.round((totalPaid / (totalPaid + totalOutstanding)) * 100) : 0;

  const subtotal = parseFloat(form.subtotal) || 0;
  const vatAmount = Math.round(subtotal * 0.2 * 100) / 100;
  const total = subtotal + vatAmount;

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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#181410' }}>Invoices</h1>
          <p className="text-sm mt-0.5" style={{ color: '#7a7469' }}>Track payments and outstanding amounts</p>
        </div>
        <Btn onClick={openNew}><Plus className="w-4 h-4" /> New Invoice</Btn>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          accent
          label="Outstanding"
          value={formatCurrency(totalOutstanding)}
          sub={`${invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length} invoices`}
        />
        <StatCard
          danger={overdueTotal > 0}
          label="Overdue"
          value={formatCurrency(overdueTotal)}
          sub={`${invoices.filter(i => i.status === 'overdue').length} overdue`}
        />
        <StatCard
          label="Collected"
          value={formatCurrency(totalPaid)}
          sub={`${invoices.filter(i => i.status === 'paid').length} paid`}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1" style={{ borderBottom: '1px solid #d9d4ce' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2.5 text-sm transition-colors"
              style={tab === t.id
                ? { color: '#181410', fontWeight: 500, borderBottom: '2px solid #1b5e78', marginBottom: '-1px' }
                : { color: '#7a7469' }}
            >
              {t.label}
              {t.id !== 'all' && (
                <span className="text-xs ml-1.5" style={{ color: tab === t.id ? '#8a8377' : '#c0bab4' }}>
                  {invoices.filter(i => i.status === t.id).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={selectedInv ? 'xl:col-span-2' : 'xl:col-span-3'}>
          <Panel noPad>
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-sm" style={{ color: '#c0bab4' }}>No invoices</p>
            ) : filtered.map((inv, i) => {
              const overdueDays = inv.status === 'overdue' ? daysOverdue(inv.due_date) : 0;
              return (
                <div
                  key={inv.id}
                  onClick={() => setSelected(selected === inv.id ? null : inv.id)}
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-[#eeeae4] group"
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid #d9d4ce' : 'none',
                    backgroundColor: selected === inv.id ? '#eeeae4' : undefined,
                    borderLeft: selected === inv.id ? '2px solid #1b5e78' : '2px solid transparent',
                  }}
                >
                  <span className="text-xs w-28 flex-shrink-0 font-mono font-medium" style={{ color: '#7a7469' }}>{inv.invoice_number}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: '#181410' }}>{inv.client?.company_name ?? '—'}</div>
                    <div className="text-xs mt-0.5 truncate" style={{ color: '#7a7469' }}>{inv.job?.title ?? '—'}</div>
                  </div>
                  <div className="hidden sm:flex items-center gap-4">
                    <Badge status={inv.status} />
                    {overdueDays > 0 && <span className="text-xs flex-shrink-0 font-mono font-bold" style={{ color: RED }}>{overdueDays}d overdue</span>}
                  </div>
                  <div className="text-right flex-shrink-0 w-28 ml-2">
                    <div className="text-sm font-bold font-mono tnum" style={{ color: '#181410' }}>{formatCurrency(inv.total_amount)}</div>
                    <div className="text-[11px] font-mono mt-0.5" style={{ color: '#7a7469' }}>Due {formatDate(inv.due_date)}</div>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 flex-shrink-0 transition-opacity ml-2", selected === inv.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ color: '#7a7469' }} />
                </div>
              );
            })}
          </Panel>
        </div>

        {selectedInv && (
          <div>
            <Panel actions={<button onClick={() => setSelected(null)} className="hover:text-[#181410] transition-colors" style={{ color: '#7a7469' }}><X className="w-4 h-4" /></button>}>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-medium" style={{ color: '#7a7469' }}>{selectedInv.invoice_number}</span>
                    <Badge status={selectedInv.status} />
                  </div>
                  <p className="text-base font-bold" style={{ color: '#181410' }}>{selectedInv.client?.company_name}</p>
                </div>

                <div className="space-y-3 pt-1" style={{ borderTop: '1px solid #d9d4ce' }}>
                  {[
                    { label: 'Job', value: selectedInv.job?.title ?? '—' },
                    { label: 'Issued', value: formatDate(selectedInv.issued_date), mono: true },
                    { label: 'Due', value: formatDate(selectedInv.due_date), mono: true },
                    { label: 'Paid', value: selectedInv.paid_at ? formatDate(selectedInv.paid_at) : '—', mono: true },
                  ].map(({ label, value, mono }) => (
                    <div key={label} className="flex justify-between items-baseline gap-3 pt-3" style={{ borderTop: '1px solid #ece8e3' }}>
                      <span className="text-xs flex-shrink-0 font-medium uppercase tracking-wider" style={{ color: '#7a7469' }}>{label}</span>
                      <span className={cn("text-sm text-right truncate font-medium", mono && "font-mono text-[13px]")} style={{ color: '#181410' }}>{value}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 space-y-2" style={{ borderTop: '1px solid #d9d4ce' }}>
                  {[
                    { label: 'Subtotal', value: formatCurrency(selectedInv.subtotal) },
                    { label: 'VAT (20%)', value: formatCurrency(selectedInv.vat_amount) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="font-medium" style={{ color: '#7a7469' }}>{label}</span>
                      <span className="font-mono" style={{ color: '#8a8377' }}>{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-2" style={{ borderTop: '1px solid #d9d4ce' }}>
                    <span className="uppercase tracking-widest text-xs" style={{ color: '#181410' }}>Total</span>
                    <span className="font-mono tnum" style={{ color: '#181410', fontSize: '1.2rem' }}>{formatCurrency(selectedInv.total_amount)}</span>
                  </div>
                </div>

                {selectedInv.notes && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#7a7469' }}>Notes</p>
                    <p className="text-sm leading-relaxed" style={{ color: '#4a4540' }}>{selectedInv.notes}</p>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-3" style={{ borderTop: '1px solid #d9d4ce' }}>
                  {selectedInv.status === 'draft' && (
                    <Btn size="sm" className="w-full justify-center" onClick={() => markSent(selectedInv.id)}>Mark as Sent</Btn>
                  )}
                  {(selectedInv.status === 'sent' || selectedInv.status === 'overdue') && (
                    <Btn size="sm" className="w-full justify-center" onClick={() => markPaid(selectedInv.id)}>Mark as Paid</Btn>
                  )}
                  <Btn variant="outline" size="sm" className="w-full justify-center"><Download className="w-3.5 h-3.5" /> Download PDF</Btn>
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
            <div className="p-4 rounded-lg space-y-2" style={{ backgroundColor: '#eeeae4', border: '1px solid #d9d4ce' }}>
              {[
                { label: 'Subtotal', value: formatCurrency(subtotal) },
                { label: 'VAT (20%)', value: formatCurrency(vatAmount) },
                { label: 'Total', value: formatCurrency(total) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span style={{ color: '#7a7469' }}>{label}</span>
                  <span style={{ color: label === 'Total' ? '#181410' : '#8a8377', fontFamily: "'JetBrains Mono', monospace", fontWeight: label === 'Total' ? 600 : 400 }}>{value}</span>
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

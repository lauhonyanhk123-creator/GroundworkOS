import { useState } from 'react';
import { Plus, Search, Trash2, X } from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { Btn } from '../components/ui/Btn';
import { Modal, Field, Input, Select, Textarea } from '../components/ui/Modal';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { useApp, nextQuoteNumber } from '../store/AppContext';
import type { LineItem } from '../types';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'declined', label: 'Declined' },
];

const emptyLineItem = (): LineItem => ({
  id: crypto.randomUUID(),
  description: '',
  quantity: 1,
  unit: 'm²',
  unit_price: 0,
  total: 0,
});

const emptyForm = {
  client_id: '',
  title: '',
  valid_until: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; })(),
  notes: '',
  line_items: [emptyLineItem()],
};

export function QuotesPage() {
  const { state, dispatch } = useApp();
  const { quotes, clients } = state;

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = quotes.filter(q => {
    if (tab !== 'all' && q.status !== tab) return false;
    if (search) {
      const sq = search.toLowerCase();
      return (q.title ?? '').toLowerCase().includes(sq) || q.quote_number.toLowerCase().includes(sq) || (q.client?.company_name ?? '').toLowerCase().includes(sq);
    }
    return true;
  });

  const accepted = quotes.filter(q => q.status === 'accepted');
  const sentAndAbove = quotes.filter(q => q.status !== 'draft');
  const acceptedRate = sentAndAbove.length > 0 ? Math.round((accepted.length / sentAndAbove.length) * 100) : 0;

  function updateLineItem(id: string, field: keyof LineItem, value: string | number) {
    setForm(f => ({
      ...f,
      line_items: f.line_items.map(li => {
        if (li.id !== id) return li;
        const updated = { ...li, [field]: value };
        updated.total = Math.round(updated.quantity * updated.unit_price * 100) / 100;
        return updated;
      }),
    }));
  }

  function addLineItem() {
    setForm(f => ({ ...f, line_items: [...f.line_items, emptyLineItem()] }));
  }

  function removeLineItem(id: string) {
    setForm(f => ({ ...f, line_items: f.line_items.filter(li => li.id !== id) }));
  }

  const subtotal = form.line_items.reduce((s, li) => s + li.total, 0);
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
    if (!form.title.trim()) e.title = 'Title is required';
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const client = clients.find(c => c.id === form.client_id);
    dispatch({
      type: 'ADD_QUOTE',
      quote: {
        id: crypto.randomUUID(),
        quote_number: nextQuoteNumber(quotes),
        client_id: form.client_id,
        client: client ? { company_name: client.company_name } : null,
        job_id: null,
        title: form.title.trim(),
        status: 'draft',
        subtotal,
        vat_amount: vatAmount,
        total_amount: total,
        valid_until: form.valid_until || null,
        notes: form.notes || null,
        line_items: form.line_items.filter(li => li.description.trim()),
        created_at: new Date().toISOString(),
        sent_at: null,
      },
    });
    setShowModal(false);
  }

  function sendQuote(id: string) {
    dispatch({ type: 'UPDATE_QUOTE', id, updates: { status: 'sent', sent_at: new Date().toISOString() } });
  }

  function acceptQuote(id: string) {
    dispatch({ type: 'UPDATE_QUOTE', id, updates: { status: 'accepted' } });
  }

  const selectedQuote = selected ? quotes.find(q => q.id === selected) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#e2e2e2' }}>Quotes</h1>
          <p className="text-sm mt-0.5" style={{ color: '#5a5a5a' }}>Create and manage quotations</p>
        </div>
        <Btn onClick={openNew}><Plus className="w-4 h-4" /> New Quote</Btn>
      </div>

      <div className="flex items-center gap-6 py-4 px-5 rounded-lg" style={{ backgroundColor: '#111111', border: '1px solid #1a1a1a' }}>
        {[
          { label: 'Total Quoted', value: formatCurrency(quotes.reduce((s, q) => s + q.total_amount, 0)), sub: `${quotes.length} quotes` },
          { label: 'Accepted Rate', value: `${acceptedRate}%`, sub: `${accepted.length} accepted` },
          { label: 'Accepted Value', value: formatCurrency(accepted.reduce((s, q) => s + q.total_amount, 0)), sub: 'converted' },
        ].map(({ label, value, sub }, i) => (
          <div key={label} className={cn('flex-1', i > 0 ? 'pl-6' : '')} style={i > 0 ? { borderLeft: '1px solid #1a1a1a' } : undefined}>
            <p className="text-xs font-medium uppercase tracking-widest mb-1.5" style={{ color: '#5a5a5a', letterSpacing: '0.08em' }}>{label}</p>
            <p className="text-2xl font-bold leading-none mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#e2e2e2' }}>{value}</p>
            <p className="text-xs" style={{ color: '#5a5a5a' }}>{sub}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1" style={{ borderBottom: '1px solid #1a1a1a' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2.5 text-sm transition-colors"
              style={tab === t.id
                ? { color: '#e2e2e2', fontWeight: 500, borderBottom: '2px solid #e2e2e2', marginBottom: '-1px' }
                : { color: '#5a5a5a' }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#3a3a3a' }} />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-1.5 rounded-md text-sm w-48 focus:outline-none"
            style={{ backgroundColor: '#111111', border: '1px solid #1a1a1a', color: '#e2e2e2' }}
            onFocus={e => (e.target.style.borderColor = '#2a2a2a')}
            onBlur={e => (e.target.style.borderColor = '#1a1a1a')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={selectedQuote ? 'xl:col-span-2' : 'xl:col-span-3'}>
          <Panel noPad>
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-sm" style={{ color: '#3a3a3a' }}>No quotes found</p>
            ) : filtered.map((q, i) => (
              <div
                key={q.id}
                onClick={() => setSelected(selected === q.id ? null : q.id)}
                className="flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors hover:bg-[#161616]"
                style={{
                  borderBottom: i < filtered.length - 1 ? '1px solid #1a1a1a' : 'none',
                  backgroundColor: selected === q.id ? '#161616' : undefined,
                  borderLeft: selected === q.id ? '2px solid #e2e2e2' : '2px solid transparent',
                }}
              >
                <span className="text-xs w-28 flex-shrink-0" style={{ color: '#5a5a5a', fontFamily: "'DM Mono', monospace" }}>{q.quote_number}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: '#e2e2e2' }}>{q.title ?? '—'}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#5a5a5a' }}>{q.client?.company_name ?? '—'}</div>
                </div>
                <Badge status={q.status} />
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold" style={{ color: '#e2e2e2', fontFamily: "'DM Mono', monospace" }}>{formatCurrency(q.total_amount)}</div>
                  {q.valid_until && <div className="text-xs" style={{ color: '#5a5a5a' }}>Until {formatDate(q.valid_until)}</div>}
                </div>
              </div>
            ))}
          </Panel>
        </div>

        {selectedQuote && (
          <div>
            <Panel actions={<button onClick={() => setSelected(null)} style={{ color: '#5a5a5a' }}><X className="w-4 h-4" /></button>}>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: '#5a5a5a', fontFamily: "'DM Mono', monospace" }}>{selectedQuote.quote_number}</span>
                    <Badge status={selectedQuote.status} />
                  </div>
                  <h3 className="text-base font-semibold leading-snug" style={{ color: '#e2e2e2' }}>{selectedQuote.title}</h3>
                </div>

                <div className="space-y-3 pt-1" style={{ borderTop: '1px solid #1a1a1a' }}>
                  {[
                    { label: 'Client', value: selectedQuote.client?.company_name ?? '—' },
                    { label: 'Sent', value: formatDate(selectedQuote.sent_at) },
                    { label: 'Valid Until', value: formatDate(selectedQuote.valid_until) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-baseline gap-3 pt-3" style={{ borderTop: '1px solid #141414' }}>
                      <span className="text-xs flex-shrink-0" style={{ color: '#5a5a5a' }}>{label}</span>
                      <span className="text-sm text-right" style={{ color: '#e2e2e2' }}>{value}</span>
                    </div>
                  ))}
                </div>

                {selectedQuote.line_items.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#5a5a5a', letterSpacing: '0.08em' }}>Line Items</p>
                    <div className="space-y-2">
                      {selectedQuote.line_items.map(li => (
                        <div key={li.id} className="flex items-start justify-between gap-3 text-xs pb-2" style={{ borderBottom: '1px solid #141414' }}>
                          <div className="flex-1">
                            <div className="mb-0.5" style={{ color: '#e2e2e2' }}>{li.description}</div>
                            <div style={{ color: '#5a5a5a', fontFamily: "'DM Mono', monospace" }}>{li.quantity} {li.unit} × {formatCurrency(li.unit_price)}</div>
                          </div>
                          <div className="font-semibold flex-shrink-0" style={{ color: '#e2e2e2', fontFamily: "'DM Mono', monospace" }}>{formatCurrency(li.total)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 space-y-2" style={{ borderTop: '1px solid #1a1a1a' }}>
                  {[
                    { label: 'Subtotal', value: formatCurrency(selectedQuote.subtotal) },
                    { label: 'VAT (20%)', value: formatCurrency(selectedQuote.vat_amount) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span style={{ color: '#5a5a5a' }}>{label}</span>
                      <span style={{ color: '#7a7a7a', fontFamily: "'DM Mono', monospace" }}>{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-2" style={{ borderTop: '1px solid #1a1a1a' }}>
                    <span style={{ color: '#e2e2e2' }}>Total</span>
                    <span style={{ color: '#e2e2e2', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem' }}>{formatCurrency(selectedQuote.total_amount)}</span>
                  </div>
                </div>

                {selectedQuote.notes && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#5a5a5a', letterSpacing: '0.08em' }}>Notes</p>
                    <p className="text-sm leading-relaxed" style={{ color: '#7a7a7a' }}>{selectedQuote.notes}</p>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  {selectedQuote.status === 'draft' && (
                    <Btn size="sm" className="w-full justify-center" onClick={() => sendQuote(selectedQuote.id)}>Send Quote</Btn>
                  )}
                  {selectedQuote.status === 'sent' && (
                    <Btn size="sm" className="w-full justify-center" onClick={() => acceptQuote(selectedQuote.id)}>Mark Accepted</Btn>
                  )}
                  <Btn variant="outline" size="sm" className="w-full justify-center">Download PDF</Btn>
                </div>
              </div>
            </Panel>
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Quote" wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Client" required>
              <Select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </Select>
              {errors.client_id && <p className="mt-1 text-xs" style={{ color: '#e03a3a' }}>{errors.client_id}</p>}
            </Field>
            <Field label="Valid Until">
              <Input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
            </Field>
          </div>
          <Field label="Quote Title" required>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Drainage Installation — New Estate Phase 2" />
            {errors.title && <p className="mt-1 text-xs" style={{ color: '#e03a3a' }}>{errors.title}</p>}
          </Field>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-widest" style={{ color: '#5a5a5a', letterSpacing: '0.08em' }}>Line Items</span>
              <button onClick={addLineItem} className="text-xs flex items-center gap-1" style={{ color: '#7a7a7a' }}>
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {form.line_items.map((li, idx) => (
                <div key={li.id} className="p-4 rounded-lg space-y-2.5" style={{ backgroundColor: '#161616', border: '1px solid #1a1a1a' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: '#5a5a5a' }}>Item {idx + 1}</span>
                    {form.line_items.length > 1 && (
                      <button onClick={() => removeLineItem(li.id)} style={{ color: '#5a5a5a' }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <Input value={li.description} onChange={e => updateLineItem(li.id, 'description', e.target.value)} placeholder="Description" />
                  <div className="grid grid-cols-4 gap-2">
                    <Input type="number" value={li.quantity} onChange={e => updateLineItem(li.id, 'quantity', parseFloat(e.target.value) || 0)} placeholder="Qty" />
                    <Input value={li.unit} onChange={e => updateLineItem(li.id, 'unit', e.target.value)} placeholder="Unit" />
                    <Input type="number" value={li.unit_price || ''} onChange={e => updateLineItem(li.id, 'unit_price', parseFloat(e.target.value) || 0)} placeholder="£/unit" />
                    <div className="py-2 px-3 rounded-md text-sm text-right" style={{ backgroundColor: '#111111', color: '#e2e2e2', fontFamily: "'DM Mono', monospace", border: '1px solid #1a1a1a' }}>
                      {formatCurrency(li.total)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {subtotal > 0 && (
            <div className="p-4 rounded-lg space-y-2" style={{ backgroundColor: '#161616', border: '1px solid #1a1a1a' }}>
              {[
                { label: 'Subtotal', value: formatCurrency(subtotal) },
                { label: 'VAT (20%)', value: formatCurrency(vatAmount) },
                { label: 'Total', value: formatCurrency(total) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span style={{ color: '#5a5a5a' }}>{label}</span>
                  <span style={{ color: label === 'Total' ? '#e2e2e2' : '#7a7a7a', fontFamily: "'DM Mono', monospace", fontWeight: label === 'Total' ? 600 : 400 }}>{value}</span>
                </div>
              ))}
            </div>
          )}
          <Field label="Notes">
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Disposal costs subject to tip charges in force at time of works." rows={2} />
          </Field>
          <div className="flex gap-3 pt-2">
            <Btn className="flex-1 justify-center" onClick={handleSubmit}>Create Quote</Btn>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

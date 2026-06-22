import { useState } from 'react';
import { Plus, Search, Mail, Phone, X } from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { Btn } from '../components/ui/Btn';
import { Modal, Field, Input, Textarea } from '../components/ui/Modal';
import { cn, formatCurrency } from '../lib/utils';
import { useApp } from '../store/AppContext';

const emptyForm = {
  company_name: '', contact_name: '', email: '',
  phone: '', address: '', vat_number: '', notes: '',
};

export function ClientsPage() {
  const { state, dispatch } = useApp();
  const { clients } = state;

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = clients.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.company_name.toLowerCase().includes(q) || (c.contact_name ?? '').toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q);
  });

  const selectedClient = selected ? clients.find(c => c.id === selected) : null;
  const totalValue = clients.reduce((s, c) => s + c.total_value, 0);

  function openNew() {
    setForm(emptyForm);
    setErrors({});
    setShowModal(true);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.company_name.trim()) e.company_name = 'Company name is required';
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    dispatch({
      type: 'ADD_CLIENT',
      client: {
        id: crypto.randomUUID(),
        company_name: form.company_name.trim(),
        contact_name: form.contact_name || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        vat_number: form.vat_number || null,
        notes: form.notes || null,
        total_jobs: 0,
        total_value: 0,
        created_at: new Date().toISOString(),
      },
    });
    setShowModal(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#e2e2e2' }}>Clients</h1>
          <p className="text-sm mt-0.5" style={{ color: '#5a5a5a' }}>{clients.length} clients · {formatCurrency(totalValue)} total value</p>
        </div>
        <Btn onClick={openNew}><Plus className="w-4 h-4" /> New Client</Btn>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#3a3a3a' }} />
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 pr-4 py-2 rounded-md text-sm w-64 focus:outline-none"
          style={{ backgroundColor: '#111111', border: '1px solid #1a1a1a', color: '#e2e2e2' }}
          onFocus={e => (e.target.style.borderColor = '#2a2a2a')}
          onBlur={e => (e.target.style.borderColor = '#1a1a1a')}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={selectedClient ? 'xl:col-span-2' : 'xl:col-span-3'}>
          <Panel noPad>
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-sm" style={{ color: '#3a3a3a' }}>No clients found</p>
            ) : filtered.map((client, i) => (
              <div
                key={client.id}
                onClick={() => setSelected(selected === client.id ? null : client.id)}
                className="flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors hover:bg-[#161616]"
                style={{
                  borderBottom: i < filtered.length - 1 ? '1px solid #1a1a1a' : 'none',
                  backgroundColor: selected === client.id ? '#161616' : undefined,
                  borderLeft: selected === client.id ? '2px solid #FFD600' : '2px solid transparent',
                }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: '#1f1f1f', color: '#7a7a7a', border: '1px solid #222' }}>
                  {client.company_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium" style={{ color: '#e2e2e2' }}>{client.company_name}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#5a5a5a' }}>{client.contact_name ?? '—'}</div>
                </div>
                <div className="text-right hidden sm:block flex-shrink-0">
                  <div className="text-sm font-medium" style={{ color: '#e2e2e2' }}>{client.total_jobs} jobs</div>
                  <div className="text-xs" style={{ color: '#5a5a5a', fontFamily: "'DM Mono', monospace" }}>{formatCurrency(client.total_value)}</div>
                </div>
                {client.email && (
                  <div className="hidden md:flex items-center gap-1.5 text-xs" style={{ color: '#5a5a5a' }}>
                    <Mail className="w-3 h-3" />
                    <span style={{ fontFamily: "'DM Mono', monospace" }}>{client.email}</span>
                  </div>
                )}
              </div>
            ))}
          </Panel>
        </div>

        {selectedClient && (
          <div>
            <Panel actions={<button onClick={() => setSelected(null)} style={{ color: '#5a5a5a' }}><X className="w-4 h-4" /></button>}>
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0" style={{ backgroundColor: '#1f1f1f', color: '#e2e2e2', border: '1px solid #222' }}>
                    {selectedClient.company_name[0]}
                  </div>
                  <div>
                    <div className="font-semibold leading-snug" style={{ color: '#e2e2e2' }}>{selectedClient.company_name}</div>
                    <div className="text-sm" style={{ color: '#5a5a5a' }}>{selectedClient.contact_name ?? '—'}</div>
                  </div>
                </div>

                <div className="flex gap-4 py-4" style={{ borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a' }}>
                  <div className="flex-1 text-center">
                    <div className="text-2xl font-bold mb-0.5" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#e2e2e2' }}>{selectedClient.total_jobs}</div>
                    <div className="text-xs" style={{ color: '#5a5a5a' }}>Jobs</div>
                  </div>
                  <div className="flex-1 text-center" style={{ borderLeft: '1px solid #1a1a1a' }}>
                    <div className="text-2xl font-bold mb-0.5" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#e2e2e2' }}>{formatCurrency(selectedClient.total_value)}</div>
                    <div className="text-xs" style={{ color: '#5a5a5a' }}>Value</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Email', value: selectedClient.email, icon: <Mail className="w-3 h-3" /> },
                    { label: 'Phone', value: selectedClient.phone, icon: <Phone className="w-3 h-3" /> },
                    { label: 'Address', value: selectedClient.address, icon: null },
                    { label: 'VAT No', value: selectedClient.vat_number, icon: null },
                  ].map(({ label, value, icon }) => (
                    <div key={label} className="flex justify-between items-start gap-3 pt-3" style={{ borderTop: '1px solid #141414' }}>
                      <span className="text-xs flex-shrink-0" style={{ color: '#5a5a5a' }}>{label}</span>
                      <span className="text-sm text-right flex items-center gap-1.5" style={{ color: value ? '#e2e2e2' : '#3a3a3a' }}>
                        {icon && <span style={{ color: '#5a5a5a' }}>{icon}</span>}
                        {value ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>

                {selectedClient.notes && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#5a5a5a', letterSpacing: '0.08em' }}>Notes</p>
                    <p className="text-sm leading-relaxed" style={{ color: '#7a7a7a' }}>{selectedClient.notes}</p>
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Client">
        <div className="space-y-4">
          <Field label="Company Name" required>
            <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="e.g. Midlands Groundworks Ltd" />
            {errors.company_name && <p className="mt-1 text-xs" style={{ color: '#e03a3a' }}>{errors.company_name}</p>}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact Name">
              <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="e.g. John Smith" />
            </Field>
            <Field label="VAT Number">
              <Input value={form.vat_number} onChange={e => setForm(f => ({ ...f, vat_number: e.target.value }))} placeholder="e.g. GB123456789" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@company.co.uk" />
            </Field>
            <Field label="Phone">
              <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="07700 900000" />
            </Field>
          </div>
          <Field label="Address">
            <Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Business Park, Birmingham, B1 1AA" rows={2} />
          </Field>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any relevant notes..." rows={2} />
          </Field>
          <div className="flex gap-3 pt-2">
            <Btn className="flex-1 justify-center" onClick={handleSubmit}>Add Client</Btn>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

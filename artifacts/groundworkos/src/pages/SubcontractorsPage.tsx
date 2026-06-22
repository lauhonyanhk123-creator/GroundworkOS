import { useState } from 'react';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { Btn } from '../components/ui/Btn';
import { Modal, Field, Input, Select, Textarea } from '../components/ui/Modal';
import { cn, formatDate, daysUntil } from '../lib/utils';
import { useApp } from '../store/AppContext';
import type { CISStatus } from '../types';

const CIS_STATUSES: CISStatus[] = ['gross', 'net', 'unverified'];

const emptyForm = {
  company_name: '', contact_name: '', trade: '', email: '',
  phone: '', utr_number: '', cis_status: 'net' as CISStatus,
  nrswa_card_number: '', public_liability_expiry: '',
  cscs_card_expiry: '', nrswa_expiry: '', notes: '',
};

export function SubcontractorsPage() {
  const { state, dispatch } = useApp();
  const { subcontractors } = state;

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'active' | 'inactive'>('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = subcontractors.filter(s => {
    if (tab === 'active' && !s.active) return false;
    if (tab === 'inactive' && s.active) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return s.company_name.toLowerCase().includes(q) || (s.contact_name ?? '').toLowerCase().includes(q) || (s.trade ?? '').toLowerCase().includes(q);
  });

  const selectedSub = selected ? subcontractors.find(s => s.id === selected) : null;

  function getDocWarnings(sub: typeof subcontractors[0]) {
    const warnings: string[] = [];
    const plDays = daysUntil(sub.public_liability_expiry);
    if (plDays !== null && plDays <= 30) warnings.push(`PL Insurance ${plDays <= 0 ? 'EXPIRED' : `expires in ${plDays}d`}`);
    const nrswaDays = daysUntil(sub.nrswa_expiry);
    if (sub.nrswa_card_number && nrswaDays !== null && nrswaDays <= 60) warnings.push(`NRSWA ${nrswaDays <= 0 ? 'EXPIRED' : `expires in ${nrswaDays}d`}`);
    const cscsDays = daysUntil(sub.cscs_card_expiry);
    if (cscsDays !== null && cscsDays <= 30) warnings.push(`CSCS ${cscsDays <= 0 ? 'EXPIRED' : `expires in ${cscsDays}d`}`);
    return warnings;
  }

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
    const deductionRate = form.cis_status === 'gross' ? 0 : form.cis_status === 'net' ? 20 : 30;
    dispatch({
      type: 'ADD_SUBCONTRACTOR',
      sub: {
        id: crypto.randomUUID(),
        company_name: form.company_name.trim(),
        contact_name: form.contact_name || null,
        trade: form.trade || null,
        email: form.email || null,
        phone: form.phone || null,
        utr_number: form.utr_number || null,
        cis_status: form.cis_status,
        cis_deduction_rate: deductionRate,
        nrswa_card_number: form.nrswa_card_number || null,
        nrswa_expiry: form.nrswa_expiry || null,
        public_liability_expiry: form.public_liability_expiry || null,
        cscs_card_expiry: form.cscs_card_expiry || null,
        notes: form.notes || null,
        active: true,
        created_at: new Date().toISOString(),
      },
    });
    setShowModal(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Subcontractors</h1>
          <p className="text-sm mt-0.5" style={{ color: '#666666' }}>CIS, compliance and document tracking</p>
        </div>
        <Btn onClick={openNew}><Plus className="w-4 h-4" /> Add Subcontractor</Btn>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Active Subcons', value: subcontractors.filter(s => s.active).length },
          { label: 'Gross Status', value: subcontractors.filter(s => s.cis_status === 'gross').length },
          { label: 'Net 20% Status', value: subcontractors.filter(s => s.cis_status === 'net').length },
          { label: 'Unverified', value: subcontractors.filter(s => s.cis_status === 'unverified').length },
        ].map(({ label, value }) => (
          <div key={label} className="p-3 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
            <div className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: '#444444' }}>{label}</div>
            <div className="text-2xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#FFD600' }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 p-0.5 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
          {(['all', 'active', 'inactive'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="px-3 py-1.5 rounded text-sm capitalize transition-colors" style={tab === t ? { backgroundColor: '#FFD600', color: '#0c0c0c', fontWeight: 700 } : { color: '#666666' }}>{t}</button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#444444' }} />
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-1.5 rounded text-sm w-48 focus:outline-none" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a', color: '#e8e8e8', fontFamily: "'DM Mono', monospace" }} onFocus={e => (e.target.style.borderColor = '#FFD600')} onBlur={e => (e.target.style.borderColor = '#2a2a2a')} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={selectedSub ? 'xl:col-span-2' : 'xl:col-span-3'}>
          <Panel>
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-sm" style={{ color: '#444444' }}>No subcontractors found</p>
            ) : (
              <div className="space-y-2">
                {filtered.map(sub => {
                  const warnings = getDocWarnings(sub);
                  return (
                    <div key={sub.id} onClick={() => setSelected(selected === sub.id ? null : sub.id)} className={cn('flex items-center gap-3 p-3 rounded cursor-pointer transition-colors', selected === sub.id ? 'ring-1 ring-[#FFD600]' : 'hover:bg-[#242424]')} style={{ backgroundColor: '#1c1c1c' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: '#242424', color: '#FFD600', fontFamily: "'Barlow Condensed', sans-serif" }}>
                        {sub.company_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: '#e8e8e8' }}>{sub.company_name}</span>
                          {warnings.length > 0 && <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#fb923c' }} />}
                        </div>
                        <div className="text-xs" style={{ color: '#666666' }}>{sub.trade ?? '—'} · {sub.contact_name ?? '—'}</div>
                      </div>
                      <Badge status={sub.cis_status} />
                      {sub.nrswa_card_number && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-mono hidden md:block" style={{ backgroundColor: '#1a1a2e', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>NRSWA</span>
                      )}
                      <div className="text-xs text-right hidden md:block" style={{ color: '#444444', fontFamily: "'DM Mono', monospace" }}>
                        <div>UTR</div>
                        <div>{sub.utr_number ? sub.utr_number.slice(0, 7) + '...' : '—'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {selectedSub && (
          <div>
            <Panel title="Subcontractor" actions={<button onClick={() => setSelected(null)} className="text-xs font-mono" style={{ color: '#666666' }}>✕</button>}>
              <div className="space-y-4">
                <div>
                  <div className="font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', color: '#e8e8e8' }}>{selectedSub.company_name}</div>
                  <div className="text-sm mt-0.5" style={{ color: '#666666' }}>{selectedSub.trade ?? '—'}</div>
                  <div className="mt-1"><Badge status={selectedSub.cis_status} /></div>
                </div>
                {[
                  { label: 'Contact', value: selectedSub.contact_name ?? '—' },
                  { label: 'Phone', value: selectedSub.phone ?? '—' },
                  { label: 'Email', value: selectedSub.email ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-xs font-mono uppercase tracking-wider" style={{ color: '#444444' }}>{label}</div>
                    <div className="text-sm mt-0.5" style={{ color: '#e8e8e8' }}>{value}</div>
                  </div>
                ))}
                <div className="p-3 rounded" style={{ backgroundColor: '#1a1400', border: '1px solid rgba(255,214,0,0.2)' }}>
                  <div className="text-xs font-mono uppercase font-bold mb-2" style={{ color: '#FFD600' }}>CIS Details</div>
                  {[
                    { label: 'UTR', value: selectedSub.utr_number ?? '—' },
                    { label: 'Status', value: selectedSub.cis_status.toUpperCase() },
                    { label: 'Deduction Rate', value: `${selectedSub.cis_deduction_rate}%` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-xs mb-1">
                      <span style={{ color: '#666666', fontFamily: "'DM Mono', monospace" }}>{label}</span>
                      <span style={{ color: '#e8e8e8', fontFamily: "'DM Mono', monospace" }}>{value}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-xs font-mono uppercase font-bold mb-2" style={{ color: '#444444' }}>Compliance</div>
                  {[
                    { label: 'NRSWA Card', expiry: selectedSub.nrswa_expiry },
                    { label: 'Public Liability', expiry: selectedSub.public_liability_expiry },
                    { label: 'CSCS Card', expiry: selectedSub.cscs_card_expiry },
                  ].map(({ label, expiry }) => {
                    const days = daysUntil(expiry);
                    const isExpiring = days !== null && days <= 30 && days > 0;
                    const isExpired = days !== null && days <= 0;
                    return (
                      <div key={label} className="flex justify-between items-center py-1.5 text-xs" style={{ borderBottom: '1px solid #1c1c1c' }}>
                        <span style={{ color: '#666666', fontFamily: "'DM Mono', monospace" }}>{label}</span>
                        <span style={{ color: isExpired ? '#ff4444' : isExpiring ? '#fb923c' : expiry ? '#4ade80' : '#444444', fontFamily: "'DM Mono', monospace" }}>
                          {expiry ? formatDate(expiry) : 'N/A'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {getDocWarnings(selectedSub).length > 0 && (
                  <div className="p-2.5 rounded" style={{ backgroundColor: '#1f1500', border: '1px solid rgba(251,146,60,0.3)' }}>
                    {getDocWarnings(selectedSub).map(w => (
                      <div key={w} className="flex items-center gap-1.5 text-xs" style={{ color: '#fb923c' }}>
                        <AlertTriangle className="w-3 h-3" />{w}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Subcontractor">
        <div className="space-y-4">
          <Field label="Company Name" required>
            <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="e.g. Smith Groundworks Ltd" />
            {errors.company_name && <p className="mt-1 text-xs" style={{ color: '#ff4444' }}>{errors.company_name}</p>}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact Name">
              <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="e.g. Mike Smith" />
            </Field>
            <Field label="Trade">
              <Input value={form.trade} onChange={e => setForm(f => ({ ...f, trade: e.target.value }))} placeholder="e.g. Drainage, Piling" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="07700 900000" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="mike@smith.co.uk" />
            </Field>
          </div>

          <div className="p-3 rounded" style={{ backgroundColor: '#1a1400', border: '1px solid rgba(255,214,0,0.15)' }}>
            <div className="text-xs font-mono uppercase font-bold mb-3" style={{ color: '#FFD600' }}>CIS Details</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="UTR Number">
                <Input value={form.utr_number} onChange={e => setForm(f => ({ ...f, utr_number: e.target.value }))} placeholder="1234567890" />
              </Field>
              <Field label="CIS Status">
                <Select value={form.cis_status} onChange={e => setForm(f => ({ ...f, cis_status: e.target.value as CISStatus }))}>
                  {CIS_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}{s === 'net' ? ' (20%)' : s === 'unverified' ? ' (30%)' : ' (0%)'}</option>)}
                </Select>
              </Field>
            </div>
          </div>

          <div>
            <div className="text-xs font-mono uppercase tracking-wider mb-3" style={{ color: '#444444' }}>Compliance Expiry Dates</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="NRSWA Card No">
                <Input value={form.nrswa_card_number} onChange={e => setForm(f => ({ ...f, nrswa_card_number: e.target.value }))} placeholder="Card number" />
              </Field>
              <Field label="NRSWA Expiry">
                <Input type="date" value={form.nrswa_expiry} onChange={e => setForm(f => ({ ...f, nrswa_expiry: e.target.value }))} />
              </Field>
              <Field label="PL Insurance Expiry">
                <Input type="date" value={form.public_liability_expiry} onChange={e => setForm(f => ({ ...f, public_liability_expiry: e.target.value }))} />
              </Field>
              <Field label="CSCS Card Expiry">
                <Input type="date" value={form.cscs_card_expiry} onChange={e => setForm(f => ({ ...f, cscs_card_expiry: e.target.value }))} />
              </Field>
            </div>
          </div>

          <Field label="Notes">
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any relevant notes..." rows={2} />
          </Field>

          <div className="flex gap-3 pt-2">
            <Btn className="flex-1 justify-center" onClick={handleSubmit}>Add Subcontractor</Btn>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

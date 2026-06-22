import { useState } from 'react';
import { Plus, Search, AlertTriangle, X } from 'lucide-react';
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#181410' }}>Subcontractors</h1>
          <p className="text-sm mt-0.5" style={{ color: '#7a7469' }}>CIS, compliance and document tracking</p>
        </div>
        <Btn onClick={openNew}><Plus className="w-4 h-4" /> Add Subcontractor</Btn>
      </div>

      <div className="flex items-center gap-6 py-4 px-5 rounded-lg" style={{ backgroundColor: '#fafaf8', border: '1px solid #1a1a1a' }}>
        {[
          { label: 'Active', value: subcontractors.filter(s => s.active).length },
          { label: 'Gross', value: subcontractors.filter(s => s.cis_status === 'gross').length },
          { label: 'Net 20%', value: subcontractors.filter(s => s.cis_status === 'net').length },
          { label: 'Unverified', value: subcontractors.filter(s => s.cis_status === 'unverified').length },
        ].map(({ label, value }, i) => (
          <div key={label} className={i > 0 ? 'pl-6' : ''} style={i > 0 ? { borderLeft: '1px solid #1a1a1a' } : undefined}>
            <p className="text-xs font-medium uppercase tracking-widest mb-1.5" style={{ color: '#7a7469', letterSpacing: '0.08em' }}>{label}</p>
            <p className="text-2xl font-bold leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#181410' }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1" style={{ borderBottom: '1px solid #1a1a1a' }}>
          {(['all', 'active', 'inactive'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2.5 text-sm capitalize transition-colors"
              style={tab === t
                ? { color: '#181410', fontWeight: 500, borderBottom: '2px solid #e2e2e2', marginBottom: '-1px' }
                : { color: '#7a7469' }}
            >{t}</button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#c0bab4' }} />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-1.5 rounded-md text-sm w-48 focus:outline-none"
            style={{ backgroundColor: '#fafaf8', border: '1px solid #1a1a1a', color: '#181410' }}
            onFocus={e => (e.target.style.borderColor = '#e0dbd5')}
            onBlur={e => (e.target.style.borderColor = '#d9d4ce')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={selectedSub ? 'xl:col-span-2' : 'xl:col-span-3'}>
          <Panel noPad>
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-sm" style={{ color: '#c0bab4' }}>No subcontractors found</p>
            ) : filtered.map((sub, i) => {
              const warnings = getDocWarnings(sub);
              return (
                <div
                  key={sub.id}
                  onClick={() => setSelected(selected === sub.id ? null : sub.id)}
                  className="flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors hover:bg-[#eeeae4]"
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid #1a1a1a' : 'none',
                    backgroundColor: selected === sub.id ? '#eeeae4' : undefined,
                    borderLeft: selected === sub.id ? '2px solid #e2e2e2' : '2px solid transparent',
                  }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: '#e8e4dd', color: '#a8a099', border: '1px solid #d9d4ce', fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {sub.company_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: '#181410' }}>{sub.company_name}</span>
                      {warnings.length > 0 && <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#e07b39' }} />}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#7a7469' }}>{sub.trade ?? '—'} · {sub.contact_name ?? '—'}</div>
                  </div>
                  <Badge status={sub.cis_status} />
                  {sub.nrswa_card_number && (
                    <span className="text-xs px-1.5 py-0.5 rounded hidden md:block" style={{ color: '#1b5e78', backgroundColor: 'rgba(77,144,212,0.08)', fontFamily: "'DM Mono', monospace" }}>NRSWA</span>
                  )}
                  <div className="text-xs text-right hidden lg:block flex-shrink-0" style={{ color: '#7a7469', fontFamily: "'DM Mono', monospace" }}>
                    {sub.utr_number ? sub.utr_number.slice(0, 7) + '...' : '—'}
                  </div>
                </div>
              );
            })}
          </Panel>
        </div>

        {selectedSub && (
          <div>
            <Panel actions={<button onClick={() => setSelected(null)} style={{ color: '#7a7469' }}><X className="w-4 h-4" /></button>}>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Badge status={selectedSub.cis_status} />
                    {!selectedSub.active && <span className="text-xs" style={{ color: '#7a7469' }}>Inactive</span>}
                  </div>
                  <h3 className="text-base font-semibold" style={{ color: '#181410' }}>{selectedSub.company_name}</h3>
                  <p className="text-sm mt-0.5" style={{ color: '#7a7469' }}>{selectedSub.trade ?? '—'}</p>
                </div>

                <div className="space-y-3 pt-1" style={{ borderTop: '1px solid #1a1a1a' }}>
                  {[
                    { label: 'Contact', value: selectedSub.contact_name ?? '—' },
                    { label: 'Phone', value: selectedSub.phone ?? '—' },
                    { label: 'Email', value: selectedSub.email ?? '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-baseline gap-3 pt-3" style={{ borderTop: '1px solid #141414' }}>
                      <span className="text-xs flex-shrink-0" style={{ color: '#7a7469' }}>{label}</span>
                      <span className="text-sm text-right truncate" style={{ color: '#181410' }}>{value}</span>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-lg" style={{ backgroundColor: '#eeeae4', border: '1px solid #d9d4ce' }}>
                  <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#7a7469', letterSpacing: '0.08em' }}>CIS Details</p>
                  {[
                    { label: 'UTR', value: selectedSub.utr_number ?? '—' },
                    { label: 'Status', value: selectedSub.cis_status.toUpperCase() },
                    { label: 'Deduction Rate', value: `${selectedSub.cis_deduction_rate}%` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-xs mb-2 last:mb-0">
                      <span style={{ color: '#7a7469' }}>{label}</span>
                      <span style={{ color: '#181410', fontFamily: "'DM Mono', monospace" }}>{value}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#7a7469', letterSpacing: '0.08em' }}>Compliance</p>
                  {[
                    { label: 'NRSWA Card', expiry: selectedSub.nrswa_expiry },
                    { label: 'Public Liability', expiry: selectedSub.public_liability_expiry },
                    { label: 'CSCS Card', expiry: selectedSub.cscs_card_expiry },
                  ].map(({ label, expiry }) => {
                    const days = daysUntil(expiry);
                    const isExpiring = days !== null && days <= 30 && days > 0;
                    const isExpired = days !== null && days <= 0;
                    return (
                      <div key={label} className="flex justify-between items-center py-2 text-xs" style={{ borderBottom: '1px solid #1a1a1a' }}>
                        <span style={{ color: '#7a7469' }}>{label}</span>
                        <span style={{ color: isExpired ? '#e03a3a' : isExpiring ? '#e07b39' : expiry ? '#3db56d' : '#c0bab4', fontFamily: "'DM Mono', monospace" }}>
                          {expiry ? formatDate(expiry) : 'N/A'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {getDocWarnings(selectedSub).length > 0 && (
                  <div className="space-y-1.5">
                    {getDocWarnings(selectedSub).map(w => (
                      <div key={w} className="flex items-center gap-1.5 text-xs" style={{ color: '#e07b39' }}>
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />{w}
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
            {errors.company_name && <p className="mt-1 text-xs" style={{ color: '#e03a3a' }}>{errors.company_name}</p>}
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

          <div className="p-3 rounded" style={{ backgroundColor: '#eeeae4', border: '1px solid #d9d4ce' }}>
            <div className="text-xs font-mono uppercase font-bold mb-3" style={{ color: '#a8a099' }}>CIS Details</div>
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

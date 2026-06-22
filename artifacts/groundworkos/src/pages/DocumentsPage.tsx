import { useState } from 'react';
import { Plus, Search, AlertTriangle, FolderOpen } from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { Btn } from '../components/ui/Btn';
import { Modal, Field, Input, Select, Textarea } from '../components/ui/Modal';
import { cn, formatDate, daysUntil } from '../lib/utils';
import { useApp } from '../store/AppContext';
import type { DocumentType, DocumentRelatedTo } from '../types';

const TYPE_LABELS: Record<DocumentType, string> = {
  rams: 'RAMS',
  insurance: 'Insurance',
  certification: 'Certification',
  permit: 'Permit',
  compliance: 'Compliance',
  contract: 'Contract',
  other: 'Other',
};

const TYPE_COLORS: Record<DocumentType, string> = {
  rams: '#FFD600',
  insurance: '#4ade80',
  certification: '#60a5fa',
  permit: '#a78bfa',
  compliance: '#fb923c',
  contract: '#e8e8e8',
  other: '#666666',
};

function getDocumentStatus(expiry_date: string | null): 'valid' | 'expiring_soon' | 'expired' {
  if (!expiry_date) return 'valid';
  const days = daysUntil(expiry_date);
  if (days === null) return 'valid';
  if (days <= 0) return 'expired';
  if (days <= 30) return 'expiring_soon';
  return 'valid';
}

const emptyForm = {
  name: '', type: 'rams' as DocumentType,
  related_to: 'company' as DocumentRelatedTo,
  related_name: '',
  issued_date: new Date().toISOString().split('T')[0],
  expiry_date: '', notes: '',
};

export function DocumentsPage() {
  const { state, dispatch } = useApp();
  const { documents } = state;

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<DocumentType | 'all'>('all');
  const [filterRelatedTo, setFilterRelatedTo] = useState<DocumentRelatedTo | 'all'>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = documents.filter(d => {
    if (filterType !== 'all' && d.type !== filterType) return false;
    if (filterRelatedTo !== 'all' && d.related_to !== filterRelatedTo) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.name.toLowerCase().includes(q) || (d.related_name ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  const expired = documents.filter(d => d.status === 'expired');
  const expiring = documents.filter(d => d.status === 'expiring_soon');
  const valid = documents.filter(d => d.status === 'valid');
  const selectedDoc = selected ? documents.find(d => d.id === selected) : null;

  function openNew() {
    setForm(emptyForm);
    setErrors({});
    setShowModal(true);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Document name is required';
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const status = getDocumentStatus(form.expiry_date || null);
    dispatch({
      type: 'ADD_DOCUMENT',
      doc: {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        type: form.type,
        related_to: form.related_to,
        related_id: null,
        related_name: form.related_name || null,
        issued_date: form.issued_date || null,
        expiry_date: form.expiry_date || null,
        status,
        notes: form.notes || null,
        created_at: new Date().toISOString(),
      },
    });
    setShowModal(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Documents</h1>
          <p className="text-sm mt-0.5" style={{ color: '#666666' }}>RAMS, compliance certs, permits & insurance</p>
        </div>
        <Btn onClick={openNew}><Plus className="w-4 h-4" /> Add Document</Btn>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Docs', value: documents.length, color: '#e8e8e8' },
          { label: 'Valid', value: valid.length, color: '#4ade80' },
          { label: 'Expiring Soon', value: expiring.length, color: '#fb923c' },
          { label: 'Expired', value: expired.length, color: '#ff4444' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-3 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
            <div className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: '#444444' }}>{label}</div>
            <div className="text-2xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{value}</div>
          </div>
        ))}
      </div>

      {(expired.length > 0 || expiring.length > 0) && (
        <div className="p-3 rounded" style={{ backgroundColor: '#1f1500', border: '1px solid rgba(251,146,60,0.3)' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" style={{ color: '#fb923c' }} />
            <span className="text-sm font-bold" style={{ color: '#fb923c' }}>Attention Required</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[...expired, ...expiring].map(d => (
              <div key={d.id} className="text-xs px-2 py-1 rounded font-mono" style={{ backgroundColor: '#0c0c0c', color: d.status === 'expired' ? '#ff4444' : '#fb923c' }}>
                {d.name} {d.status === 'expired' ? '(EXPIRED)' : `(expires ${formatDate(d.expiry_date)})`}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#444444' }} />
          <input type="text" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-1.5 rounded text-sm w-52 focus:outline-none" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a', color: '#e8e8e8', fontFamily: "'DM Mono', monospace" }} onFocus={e => (e.target.style.borderColor = '#FFD600')} onBlur={e => (e.target.style.borderColor = '#2a2a2a')} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value as DocumentType | 'all')} className="py-1.5 px-3 rounded text-sm focus:outline-none" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a', color: '#888888', fontFamily: "'DM Mono', monospace" }}>
          <option value="all">All Types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterRelatedTo} onChange={e => setFilterRelatedTo(e.target.value as DocumentRelatedTo | 'all')} className="py-1.5 px-3 rounded text-sm focus:outline-none" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a', color: '#888888', fontFamily: "'DM Mono', monospace" }}>
          <option value="all">All Categories</option>
          <option value="company">Company</option>
          <option value="job">Job</option>
          <option value="subcontractor">Subcontractor</option>
          <option value="plant">Plant</option>
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={selectedDoc ? 'xl:col-span-2' : 'xl:col-span-3'}>
          <Panel>
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-sm" style={{ color: '#444444' }}>No documents found</p>
            ) : (
              <div className="space-y-1.5">
                {filtered.map(doc => {
                  const days = daysUntil(doc.expiry_date);
                  const isExpiringSoon = days !== null && days <= 30 && days > 0;
                  const isExpired = doc.status === 'expired';
                  return (
                    <div key={doc.id} onClick={() => setSelected(selected === doc.id ? null : doc.id)} className={cn('flex items-center gap-3 p-3 rounded cursor-pointer transition-colors', selected === doc.id ? 'ring-1 ring-[#FFD600]' : 'hover:bg-[#242424]')} style={{ backgroundColor: '#1c1c1c' }}>
                      <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[doc.type] }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate" style={{ color: '#e8e8e8' }}>{doc.name}</span>
                          {(isExpired || isExpiringSoon) && <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: isExpired ? '#ff4444' : '#fb923c' }} />}
                        </div>
                        <div className="text-xs" style={{ color: '#444444' }}>
                          <span style={{ color: TYPE_COLORS[doc.type] }}>{TYPE_LABELS[doc.type]}</span>
                          {doc.related_name && <span> · {doc.related_name}</span>}
                        </div>
                      </div>
                      <Badge status={doc.status} />
                      <div className="text-right text-xs hidden md:block" style={{ color: '#444444', fontFamily: "'DM Mono', monospace", minWidth: '80px' }}>
                        {doc.expiry_date ? (
                          <>
                            <div>Expires</div>
                            <div style={{ color: isExpired ? '#ff4444' : isExpiringSoon ? '#fb923c' : '#666666' }}>{formatDate(doc.expiry_date)}</div>
                          </>
                        ) : <div>No expiry</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {selectedDoc && (
          <div>
            <Panel title="Document" actions={<button onClick={() => setSelected(null)} className="text-xs font-mono" style={{ color: '#666666' }}>✕</button>}>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <FolderOpen className="w-4 h-4" style={{ color: TYPE_COLORS[selectedDoc.type] }} />
                    <span className="text-xs font-mono uppercase" style={{ color: TYPE_COLORS[selectedDoc.type] }}>{TYPE_LABELS[selectedDoc.type]}</span>
                  </div>
                  <div className="font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', color: '#e8e8e8' }}>{selectedDoc.name}</div>
                  <div className="mt-1"><Badge status={selectedDoc.status} /></div>
                </div>
                {[
                  { label: 'Related To', value: `${selectedDoc.related_to} — ${selectedDoc.related_name ?? '—'}` },
                  { label: 'Issued', value: formatDate(selectedDoc.issued_date) },
                  { label: 'Expiry Date', value: formatDate(selectedDoc.expiry_date) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-xs font-mono uppercase tracking-wider" style={{ color: '#444444' }}>{label}</div>
                    <div className="text-sm mt-0.5" style={{ color: '#e8e8e8' }}>{value}</div>
                  </div>
                ))}
                {selectedDoc.expiry_date && (() => {
                  const days = daysUntil(selectedDoc.expiry_date);
                  if (days === null) return null;
                  const color = days <= 0 ? '#ff4444' : days <= 30 ? '#fb923c' : '#4ade80';
                  return (
                    <div className="p-2.5 rounded text-xs font-mono" style={{ backgroundColor: '#1c1c1c', border: `1px solid ${color}40`, color }}>
                      {days <= 0 ? `EXPIRED ${Math.abs(days)} days ago` : days <= 30 ? `Expires in ${days} days — renew now` : `${days} days remaining`}
                    </div>
                  );
                })()}
                {selectedDoc.notes && (
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: '#444444' }}>Notes</div>
                    <p className="text-xs leading-relaxed" style={{ color: '#888888' }}>{selectedDoc.notes}</p>
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Document">
        <div className="space-y-4">
          <Field label="Document Name" required>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. RAMS — Drain Installation Plot 4" />
            {errors.name && <p className="mt-1 text-xs" style={{ color: '#ff4444' }}>{errors.name}</p>}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Document Type">
              <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as DocumentType }))}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Related To">
              <Select value={form.related_to} onChange={e => setForm(f => ({ ...f, related_to: e.target.value as DocumentRelatedTo }))}>
                <option value="company">Company</option>
                <option value="job">Job</option>
                <option value="subcontractor">Subcontractor</option>
                <option value="plant">Plant</option>
              </Select>
            </Field>
          </div>

          <Field label="Related Name" hint="e.g. Job name, subcontractor name">
            <Input value={form.related_name} onChange={e => setForm(f => ({ ...f, related_name: e.target.value }))} placeholder="e.g. Longbridge Drainage Phase 2" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Issue Date">
              <Input type="date" value={form.issued_date} onChange={e => setForm(f => ({ ...f, issued_date: e.target.value }))} />
            </Field>
            <Field label="Expiry Date" hint="Leave blank if no expiry">
              <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
            </Field>
          </div>

          <Field label="Notes">
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any relevant notes..." rows={2} />
          </Field>

          <div className="flex gap-3 pt-2">
            <Btn className="flex-1 justify-center" onClick={handleSubmit}>Add Document</Btn>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

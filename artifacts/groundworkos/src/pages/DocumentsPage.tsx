import { useState } from 'react';
import { Plus, Search, AlertTriangle, FolderOpen } from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { Btn } from '../components/ui/Btn';
import { cn, formatDate, daysUntil } from '../lib/utils';
import { DOCUMENTS } from '../data/mock';
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

export function DocumentsPage() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<DocumentType | 'all'>('all');
  const [filterRelatedTo, setFilterRelatedTo] = useState<DocumentRelatedTo | 'all'>('all');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = DOCUMENTS.filter(d => {
    if (filterType !== 'all' && d.type !== filterType) return false;
    if (filterRelatedTo !== 'all' && d.related_to !== filterRelatedTo) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.name.toLowerCase().includes(q) || (d.related_name ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  const expired = DOCUMENTS.filter(d => d.status === 'expired');
  const expiring = DOCUMENTS.filter(d => d.status === 'expiring_soon');
  const valid = DOCUMENTS.filter(d => d.status === 'valid');
  const selectedDoc = selected ? DOCUMENTS.find(d => d.id === selected) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Documents</h1>
          <p className="text-sm mt-0.5" style={{ color: '#666666' }}>RAMS, compliance certs, permits & insurance</p>
        </div>
        <Btn><Plus className="w-4 h-4" /> Add Document</Btn>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Docs', value: DOCUMENTS.length, color: '#e8e8e8' },
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
            <div className="space-y-1.5">
              {filtered.map(doc => {
                const days = daysUntil(doc.expiry_date);
                const isExpiringSoon = days !== null && days <= 30 && days > 0;
                const isExpired = doc.status === 'expired';
                return (
                  <div key={doc.id} onClick={() => setSelected(selected === doc.id ? null : doc.id)} className={cn('flex items-center gap-3 p-3 rounded cursor-pointer transition-colors', selected === doc.id ? 'ring-1 ring-[#FFD600]' : 'hover:bg-[#1c1c1c]')} style={{ backgroundColor: '#1c1c1c' }}>
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

                <div className="flex gap-2 pt-2">
                  <Btn size="sm" className="flex-1 justify-center">Edit</Btn>
                  <Btn variant="outline" size="sm">Replace</Btn>
                </div>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { Btn } from '../components/ui/Btn';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { QUOTES } from '../data/mock';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'declined', label: 'Declined' },
];

export function QuotesPage() {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = QUOTES.filter(q => {
    if (tab !== 'all' && q.status !== tab) return false;
    if (search) {
      const sq = search.toLowerCase();
      return (q.title ?? '').toLowerCase().includes(sq) || q.quote_number.toLowerCase().includes(sq) || (q.client?.company_name ?? '').toLowerCase().includes(sq);
    }
    return true;
  });

  const accepted = QUOTES.filter(q => q.status === 'accepted');
  const acceptedRate = QUOTES.length > 0 ? Math.round((accepted.length / QUOTES.filter(q => q.status !== 'draft').length) * 100) : 0;
  const totalFiltered = filtered.reduce((s, q) => s + q.total_amount, 0);
  const selectedQuote = selected ? QUOTES.find(q => q.id === selected) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Quotes</h1>
          <p className="text-sm mt-0.5" style={{ color: '#666666' }}>Create and manage your quotations</p>
        </div>
        <Btn><Plus className="w-4 h-4" /> New Quote</Btn>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Quoted', value: formatCurrency(QUOTES.reduce((s,q) => s + q.total_amount, 0)) },
          { label: 'Accepted Rate', value: `${acceptedRate}%` },
          { label: 'Accepted Value', value: formatCurrency(accepted.reduce((s,q) => s + q.total_amount, 0)) },
        ].map(({ label, value }) => (
          <div key={label} className="p-3 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
            <div className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: '#444444' }}>{label}</div>
            <div className="text-2xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#FFD600' }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 p-1 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="px-4 py-1.5 rounded text-sm transition-colors" style={tab === t.id ? { backgroundColor: '#FFD600', color: '#0c0c0c', fontWeight: 700 } : { color: '#666666' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#444444' }} />
        <input type="text" placeholder="Search quotes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-1.5 rounded text-sm w-64 focus:outline-none" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a', color: '#e8e8e8', fontFamily: "'DM Mono', monospace" }} onFocus={e => (e.target.style.borderColor = '#FFD600')} onBlur={e => (e.target.style.borderColor = '#2a2a2a')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={selectedQuote ? 'xl:col-span-2' : 'xl:col-span-3'}>
          <Panel actions={<span className="text-xs font-mono" style={{ color: '#444444' }}>{filtered.length} quotes · {formatCurrency(totalFiltered)} total</span>}>
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-sm" style={{ color: '#444444' }}>No quotes found</p>
            ) : (
              <div className="space-y-2">
                {filtered.map(q => (
                  <div key={q.id} onClick={() => setSelected(selected === q.id ? null : q.id)} className={cn('flex items-center gap-3 p-3 rounded cursor-pointer transition-colors', selected === q.id ? 'ring-1 ring-[#FFD600]' : 'hover:bg-[#1c1c1c]')} style={{ backgroundColor: '#1c1c1c' }}>
                    <span className="text-xs font-mono w-28 flex-shrink-0" style={{ color: '#444444' }}>{q.quote_number}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: '#e8e8e8' }}>{q.title ?? '—'}</div>
                      <div className="text-xs" style={{ color: '#444444' }}>{q.client?.company_name ?? '—'}</div>
                    </div>
                    <Badge status={q.status} />
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#e8e8e8' }}>{formatCurrency(q.total_amount)}</div>
                      <div className="text-xs" style={{ color: '#444444', fontFamily: "'DM Mono', monospace" }}>+VAT {formatCurrency(q.vat_amount)}</div>
                    </div>
                    {q.valid_until && (
                      <div className="text-xs text-right hidden md:block" style={{ color: '#444444', fontFamily: "'DM Mono', monospace", minWidth: '80px' }}>
                        <div>Valid until</div>
                        <div>{formatDate(q.valid_until)}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {selectedQuote && (
          <div>
            <Panel title={selectedQuote.quote_number} actions={<button onClick={() => setSelected(null)} className="text-xs font-mono" style={{ color: '#666666' }}>✕</button>}>
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#e8e8e8' }}>{selectedQuote.title}</h3>
                  <div className="mt-1"><Badge status={selectedQuote.status} /></div>
                </div>
                {[
                  { label: 'Client', value: selectedQuote.client?.company_name ?? '—' },
                  { label: 'Sent', value: formatDate(selectedQuote.sent_at) },
                  { label: 'Valid Until', value: formatDate(selectedQuote.valid_until) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-xs font-mono uppercase tracking-wider" style={{ color: '#444444' }}>{label}</div>
                    <div className="text-sm mt-0.5" style={{ color: '#e8e8e8' }}>{value}</div>
                  </div>
                ))}

                {selectedQuote.line_items.length > 0 && (
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider mb-2" style={{ color: '#444444' }}>Line Items</div>
                    <div className="space-y-1.5">
                      {selectedQuote.line_items.map(li => (
                        <div key={li.id} className="flex items-start justify-between gap-2 text-xs py-1.5" style={{ borderBottom: '1px solid #1c1c1c' }}>
                          <div className="flex-1">
                            <div style={{ color: '#e8e8e8' }}>{li.description}</div>
                            <div style={{ color: '#444444', fontFamily: "'DM Mono', monospace" }}>{li.quantity} {li.unit} × {formatCurrency(li.unit_price)}</div>
                          </div>
                          <div className="font-bold flex-shrink-0" style={{ color: '#FFD600', fontFamily: "'DM Mono', monospace" }}>{formatCurrency(li.total)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2" style={{ borderTop: '1px solid #2a2a2a' }}>
                  {[
                    { label: 'Subtotal', value: formatCurrency(selectedQuote.subtotal) },
                    { label: 'VAT (20%)', value: formatCurrency(selectedQuote.vat_amount) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm mb-1">
                      <span style={{ color: '#666666' }}>{label}</span>
                      <span style={{ color: '#888888', fontFamily: "'DM Mono', monospace" }}>{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-base font-bold mt-2 pt-2" style={{ borderTop: '1px solid #2a2a2a' }}>
                    <span style={{ color: '#e8e8e8' }}>Total</span>
                    <span style={{ color: '#FFD600', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.25rem' }}>{formatCurrency(selectedQuote.total_amount)}</span>
                  </div>
                </div>

                {selectedQuote.notes && (
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: '#444444' }}>Notes</div>
                    <p className="text-xs leading-relaxed" style={{ color: '#888888' }}>{selectedQuote.notes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Btn size="sm" className="flex-1 justify-center">Send Quote</Btn>
                  <Btn variant="outline" size="sm">PDF</Btn>
                </div>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

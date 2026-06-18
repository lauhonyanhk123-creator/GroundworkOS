import { useState } from 'react';
import { Plus, Download } from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { Btn } from '../components/ui/Btn';
import { cn, formatCurrency, formatDate, daysOverdue } from '../lib/utils';
import { INVOICES } from '../data/mock';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'paid', label: 'Paid' },
];

export function InvoicesPage() {
  const [tab, setTab] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = INVOICES.filter(i => tab === 'all' || i.status === tab);
  const totalOutstanding = INVOICES.filter(i => i.status !== 'paid' && i.status !== 'credited').reduce((s, i) => s + i.total_amount, 0);
  const totalPaid = INVOICES.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0);
  const overdueTotal = INVOICES.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total_amount, 0);
  const selectedInv = selected ? INVOICES.find(i => i.id === selected) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Invoices</h1>
          <p className="text-sm mt-0.5" style={{ color: '#666666' }}>Track payments and outstanding amounts</p>
        </div>
        <Btn><Plus className="w-4 h-4" /> New Invoice</Btn>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Outstanding', value: formatCurrency(totalOutstanding), color: '#FFD600' },
          { label: 'Overdue', value: formatCurrency(overdueTotal), color: '#ff4444' },
          { label: 'Collected', value: formatCurrency(totalPaid), color: '#4ade80' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-3 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
            <div className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: '#444444' }}>{label}</div>
            <div className="text-2xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{value}</div>
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
                    <div key={inv.id} onClick={() => setSelected(selected === inv.id ? null : inv.id)} className={cn('flex items-center gap-3 p-3 rounded cursor-pointer transition-colors', selected === inv.id ? 'ring-1 ring-[#FFD600]' : 'hover:bg-[#1c1c1c]')} style={{ backgroundColor: '#1c1c1c' }}>
                      <span className="text-xs font-mono w-28 flex-shrink-0" style={{ color: '#444444' }}>{inv.invoice_number}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: '#e8e8e8' }}>{inv.client?.company_name ?? '—'}</div>
                        <div className="text-xs truncate" style={{ color: '#444444' }}>{inv.job?.title ?? '—'}</div>
                      </div>
                      <Badge status={inv.status} />
                      {overdueDays > 0 && (
                        <span className="text-xs font-mono" style={{ color: '#ff4444' }}>{overdueDays}d late</span>
                      )}
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
                    <div className="text-sm mt-0.5" style={{ color: '#e8e8e8' }}>{value}</div>
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
                  {selectedInv.cis_deduction && (
                    <div className="flex justify-between text-sm mb-1">
                      <span style={{ color: '#666666' }}>CIS Deduction</span>
                      <span style={{ color: '#ff4444', fontFamily: "'DM Mono', monospace" }}>-{formatCurrency(selectedInv.cis_deduction)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold mt-2 pt-2" style={{ borderTop: '1px solid #2a2a2a' }}>
                    <span style={{ color: '#e8e8e8' }}>Total</span>
                    <span style={{ color: '#FFD600', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.25rem' }}>{formatCurrency(selectedInv.total_amount)}</span>
                  </div>
                </div>

                {selectedInv.notes && (
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: '#444444' }}>Notes</div>
                    <p className="text-xs leading-relaxed" style={{ color: '#888888' }}>{selectedInv.notes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {selectedInv.status !== 'paid' && <Btn size="sm" className="flex-1 justify-center">Mark Paid</Btn>}
                  <Btn variant="outline" size="sm"><Download className="w-3 h-3" /> PDF</Btn>
                </div>
              </div>
            </Panel>
          </div>
        )}
      </div>

      <Panel title="CIS Note">
        <p className="text-xs leading-relaxed" style={{ color: '#888888' }}>
          CIS deductions from subcontractors are tracked in <span style={{ color: '#FFD600' }}>Reports → CIS Return</span>.
          For invoices where CIS applies to payments received, add the deduction above.
          Tax month filing deadline: 19th of the following month.
        </p>
      </Panel>
    </div>
  );
}

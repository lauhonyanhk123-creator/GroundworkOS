import { useState } from 'react';
import { Plus, Search, Mail, Phone } from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { Btn } from '../components/ui/Btn';
import { cn, formatCurrency } from '../lib/utils';
import { CLIENTS } from '../data/mock';

export function ClientsPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = CLIENTS.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.company_name.toLowerCase().includes(q) || (c.contact_name ?? '').toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q);
  });

  const selectedClient = selected ? CLIENTS.find(c => c.id === selected) : null;
  const totalValue = CLIENTS.reduce((s, c) => s + c.total_value, 0);
  const totalJobs = CLIENTS.reduce((s, c) => s + c.total_jobs, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Clients</h1>
          <p className="text-sm mt-0.5" style={{ color: '#666666' }}>Manage your client relationships</p>
        </div>
        <Btn><Plus className="w-4 h-4" /> New Client</Btn>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Clients', value: CLIENTS.length },
          { label: 'Total Jobs', value: totalJobs },
          { label: 'Total Value', value: formatCurrency(totalValue) },
        ].map(({ label, value }) => (
          <div key={label} className="p-3 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
            <div className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: '#444444' }}>{label}</div>
            <div className="text-2xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#FFD600' }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#444444' }} />
        <input type="text" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-1.5 rounded text-sm w-64 focus:outline-none" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a', color: '#e8e8e8', fontFamily: "'DM Mono', monospace" }} onFocus={e => (e.target.style.borderColor = '#FFD600')} onBlur={e => (e.target.style.borderColor = '#2a2a2a')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={selectedClient ? 'xl:col-span-2' : 'xl:col-span-3'}>
          <Panel>
            <div className="space-y-2">
              {filtered.map(client => (
                <div key={client.id} onClick={() => setSelected(selected === client.id ? null : client.id)} className={cn('flex items-center gap-4 p-3 rounded cursor-pointer transition-colors', selected === client.id ? 'ring-1 ring-[#FFD600]' : 'hover:bg-[#1c1c1c]')} style={{ backgroundColor: '#1c1c1c' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: '#242424', color: '#FFD600', fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {client.company_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: '#e8e8e8' }}>{client.company_name}</div>
                    <div className="text-xs" style={{ color: '#666666' }}>{client.contact_name ?? '—'}</div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#e8e8e8' }}>{client.total_jobs} jobs</div>
                    <div className="text-xs" style={{ color: '#666666', fontFamily: "'DM Mono', monospace" }}>{formatCurrency(client.total_value)}</div>
                  </div>
                  {client.email && (
                    <div className="flex items-center gap-1 hidden md:flex text-xs" style={{ color: '#444444' }}>
                      <Mail className="w-3 h-3" />
                      <span style={{ fontFamily: "'DM Mono', monospace" }}>{client.email}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {selectedClient && (
          <div>
            <Panel title="Client Details" actions={<button onClick={() => setSelected(null)} className="text-xs font-mono" style={{ color: '#666666' }}>✕</button>}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold" style={{ backgroundColor: '#1c1c1c', color: '#FFD600', fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {selectedClient.company_name[0]}
                  </div>
                  <div>
                    <div className="font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', color: '#e8e8e8' }}>{selectedClient.company_name}</div>
                    <div className="text-sm" style={{ color: '#666666' }}>{selectedClient.contact_name ?? '—'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded text-center" style={{ backgroundColor: '#1c1c1c' }}>
                    <div className="text-xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#FFD600' }}>{selectedClient.total_jobs}</div>
                    <div className="text-xs font-mono" style={{ color: '#444444' }}>Jobs</div>
                  </div>
                  <div className="p-2 rounded text-center" style={{ backgroundColor: '#1c1c1c' }}>
                    <div className="text-lg font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#FFD600' }}>{formatCurrency(selectedClient.total_value)}</div>
                    <div className="text-xs font-mono" style={{ color: '#444444' }}>Value</div>
                  </div>
                </div>

                {[
                  { label: 'Email', value: selectedClient.email, icon: <Mail className="w-3 h-3" /> },
                  { label: 'Phone', value: selectedClient.phone, icon: <Phone className="w-3 h-3" /> },
                  { label: 'Address', value: selectedClient.address, icon: null },
                  { label: 'VAT No', value: selectedClient.vat_number, icon: null },
                ].map(({ label, value, icon }) => (
                  <div key={label}>
                    <div className="text-xs font-mono uppercase tracking-wider" style={{ color: '#444444' }}>{label}</div>
                    <div className="text-sm mt-0.5 flex items-center gap-1.5" style={{ color: '#e8e8e8' }}>
                      {icon && <span style={{ color: '#666666' }}>{icon}</span>}
                      {value ?? '—'}
                    </div>
                  </div>
                ))}

                {selectedClient.notes && (
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: '#444444' }}>Notes</div>
                    <p className="text-xs leading-relaxed" style={{ color: '#888888' }}>{selectedClient.notes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Btn size="sm" className="flex-1 justify-center">Edit</Btn>
                  <Btn variant="outline" size="sm">New Invoice</Btn>
                </div>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

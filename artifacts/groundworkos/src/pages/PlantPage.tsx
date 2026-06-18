import { useState } from 'react';
import { Plus, Truck, AlertTriangle, Wrench } from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { Btn } from '../components/ui/Btn';
import { cn, formatDate, formatCurrency, daysUntil } from '../lib/utils';
import { PLANT } from '../data/mock';

export function PlantPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = PLANT.filter(p => statusFilter === 'all' || p.status === statusFilter);
  const selectedPlant = selected ? PLANT.find(p => p.id === selected) : null;

  const STATUS_OPTIONS = [
    { id: 'all', label: 'All' },
    { id: 'available', label: 'Available' },
    { id: 'on_site', label: 'On Site' },
    { id: 'maintenance', label: 'Workshop' },
    { id: 'hired_in', label: 'Hired In' },
  ];

  function getPlantAlerts(p: typeof PLANT[0]) {
    const warnings: string[] = [];
    const serviceDays = daysUntil(p.service_due);
    if (serviceDays !== null && serviceDays <= 14) warnings.push(`Service ${serviceDays <= 0 ? 'OVERDUE' : `in ${serviceDays}d`}`);
    const teDays = daysUntil(p.thorough_exam_due);
    if (teDays !== null && teDays <= 30) warnings.push(`LOLER Exam ${teDays <= 0 ? 'EXPIRED' : `in ${teDays}d`}`);
    return warnings;
  }

  const onSite = PLANT.filter(p => p.status === 'on_site').length;
  const available = PLANT.filter(p => p.status === 'available').length;
  const workshop = PLANT.filter(p => p.status === 'maintenance').length;
  const ownedCount = PLANT.filter(p => p.owned).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Plant & Machinery</h1>
          <p className="text-sm mt-0.5" style={{ color: '#666666' }}>Fleet tracking, service & LOLER compliance</p>
        </div>
        <Btn><Plus className="w-4 h-4" /> Add Plant</Btn>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'On Site', value: onSite, color: '#FFD600' },
          { label: 'Available', value: available, color: '#4ade80' },
          { label: 'Workshop', value: workshop, color: '#fb923c' },
          { label: 'Owned Fleet', value: ownedCount, color: '#60a5fa' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-3 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
            <div className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: '#444444' }}>{label}</div>
            <div className="text-2xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 p-0.5 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
        {STATUS_OPTIONS.map(opt => (
          <button key={opt.id} onClick={() => setStatusFilter(opt.id)} className="px-3 py-1.5 rounded text-sm transition-colors" style={statusFilter === opt.id ? { backgroundColor: '#FFD600', color: '#0c0c0c', fontWeight: 700 } : { color: '#666666' }}>
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={selectedPlant ? 'xl:col-span-2' : 'xl:col-span-3'}>
          <Panel>
            <div className="space-y-2">
              {filtered.map(plant => {
                const alerts = getPlantAlerts(plant);
                return (
                  <div key={plant.id} onClick={() => setSelected(selected === plant.id ? null : plant.id)} className={cn('flex items-center gap-3 p-3 rounded cursor-pointer transition-colors', selected === plant.id ? 'ring-1 ring-[#FFD600]' : 'hover:bg-[#1c1c1c]')} style={{ backgroundColor: '#1c1c1c' }}>
                    <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#242424' }}>
                      {plant.status === 'maintenance' ? <Wrench className="w-4 h-4" style={{ color: '#fb923c' }} /> : <Truck className="w-4 h-4" style={{ color: '#FFD600' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: '#e8e8e8' }}>{plant.name}</span>
                        {alerts.length > 0 && <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#fb923c' }} />}
                        {!plant.owned && <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: '#1a1a2e', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>HIRE</span>}
                      </div>
                      <div className="text-xs" style={{ color: '#666666' }}>
                        {plant.make} {plant.model} {plant.year && `(${plant.year})`} · {plant.registration ?? 'No Reg'}
                      </div>
                    </div>
                    <Badge status={plant.status} />
                    {plant.current_job && (
                      <div className="text-xs text-right hidden md:block" style={{ color: '#444444', fontFamily: "'DM Mono', monospace" }}>
                        <div>Current Job</div>
                        <div className="truncate max-w-[120px]" title={plant.current_job.title}>{plant.current_job.title}</div>
                      </div>
                    )}
                    {plant.daily_rate && (
                      <div className="text-sm text-right flex-shrink-0 hidden lg:block" style={{ color: '#888888', fontFamily: "'DM Mono', monospace" }}>
                        {formatCurrency(plant.daily_rate)}/d
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        {selectedPlant && (
          <div>
            <Panel title="Plant Details" actions={<button onClick={() => setSelected(null)} className="text-xs font-mono" style={{ color: '#666666' }}>✕</button>}>
              <div className="space-y-4">
                <div>
                  <div className="font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.05rem', color: '#e8e8e8' }}>{selectedPlant.name}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge status={selectedPlant.status} />
                    {!selectedPlant.owned && <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: '#1a1a2e', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>HIRED IN</span>}
                  </div>
                </div>

                {[
                  { label: 'Make / Model', value: `${selectedPlant.make ?? '—'} ${selectedPlant.model ?? ''}`.trim() },
                  { label: 'Year', value: selectedPlant.year?.toString() ?? '—' },
                  { label: 'Registration', value: selectedPlant.registration ?? '—' },
                  { label: 'Category', value: selectedPlant.category },
                  { label: 'Day Rate', value: selectedPlant.daily_rate ? formatCurrency(selectedPlant.daily_rate) : '—' },
                  { label: 'Current Job', value: selectedPlant.current_job?.title ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-xs font-mono uppercase tracking-wider" style={{ color: '#444444' }}>{label}</div>
                    <div className="text-sm mt-0.5" style={{ color: '#e8e8e8' }}>{value}</div>
                  </div>
                ))}

                <div className="p-3 rounded" style={{ backgroundColor: '#1c1c1c' }}>
                  <div className="text-xs font-mono uppercase font-bold mb-2" style={{ color: '#444444' }}>Compliance Dates</div>
                  {[
                    { label: 'Service Due', value: selectedPlant.service_due },
                    { label: 'MOT Due', value: selectedPlant.mot_due },
                    { label: 'LOLER Thorough Exam', value: selectedPlant.thorough_exam_due },
                  ].map(({ label, value }) => {
                    const days = daysUntil(value);
                    const isOverdue = days !== null && days <= 0;
                    const isDue = days !== null && days > 0 && days <= 30;
                    return (
                      <div key={label} className="flex justify-between items-center py-1.5 text-xs" style={{ borderBottom: '1px solid #2a2a2a' }}>
                        <span style={{ color: '#666666', fontFamily: "'DM Mono', monospace" }}>{label}</span>
                        <span style={{ color: isOverdue ? '#ff4444' : isDue ? '#fb923c' : value ? '#4ade80' : '#444444', fontFamily: "'DM Mono', monospace" }}>
                          {value ? formatDate(value) : 'N/A'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {getPlantAlerts(selectedPlant).length > 0 && (
                  <div className="p-2.5 rounded" style={{ backgroundColor: '#1f1500', border: '1px solid rgba(251,146,60,0.3)' }}>
                    {getPlantAlerts(selectedPlant).map(w => (
                      <div key={w} className="flex items-center gap-1.5 text-xs" style={{ color: '#fb923c' }}>
                        <AlertTriangle className="w-3 h-3" />
                        {w}
                      </div>
                    ))}
                  </div>
                )}

                {selectedPlant.notes && (
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: '#444444' }}>Notes</div>
                    <p className="text-xs leading-relaxed" style={{ color: '#888888' }}>{selectedPlant.notes}</p>
                  </div>
                )}

                <Btn size="sm" className="w-full justify-center">Edit Plant</Btn>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

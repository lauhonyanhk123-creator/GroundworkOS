import { useState } from 'react';
import { Plus, Truck, AlertTriangle, Wrench } from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { Btn } from '../components/ui/Btn';
import { Modal, Field, Input, Select, Textarea } from '../components/ui/Modal';
import { cn, formatDate, formatCurrency, daysUntil } from '../lib/utils';
import { useApp } from '../store/AppContext';
import type { PlantStatus } from '../types';

const PLANT_STATUSES: PlantStatus[] = ['available', 'on_site', 'maintenance', 'hired_in', 'decommissioned'];

const emptyForm = {
  name: '', make: '', model: '', year: '', registration: '',
  category: '', owned: true, daily_rate: '',
  service_due: '', mot_due: '', thorough_exam_due: '', notes: '',
};

export function PlantPage() {
  const { state, dispatch } = useApp();
  const { plant, jobs } = state;

  const [selected, setSelected] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = plant.filter(p => statusFilter === 'all' || p.status === statusFilter);
  const selectedPlant = selected ? plant.find(p => p.id === selected) : null;

  const STATUS_OPTIONS = [
    { id: 'all', label: 'All' },
    { id: 'available', label: 'Available' },
    { id: 'on_site', label: 'On Site' },
    { id: 'maintenance', label: 'Workshop' },
    { id: 'hired_in', label: 'Hired In' },
  ];

  function getPlantAlerts(p: typeof plant[0]) {
    const warnings: string[] = [];
    const serviceDays = daysUntil(p.service_due);
    if (serviceDays !== null && serviceDays <= 14) warnings.push(`Service ${serviceDays <= 0 ? 'OVERDUE' : `in ${serviceDays}d`}`);
    const teDays = daysUntil(p.thorough_exam_due);
    if (teDays !== null && teDays <= 30) warnings.push(`LOLER Exam ${teDays <= 0 ? 'EXPIRED' : `in ${teDays}d`}`);
    return warnings;
  }

  function openNew() {
    setForm(emptyForm);
    setErrors({});
    setShowModal(true);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    dispatch({
      type: 'ADD_PLANT',
      plant: {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        make: form.make || null,
        model: form.model || null,
        year: form.year ? parseInt(form.year) : null,
        registration: form.registration || null,
        category: form.category || 'other',
        owned: form.owned,
        status: 'available' as const,
        daily_rate: form.daily_rate ? parseFloat(form.daily_rate) : null,
        current_job_id: null,
        current_job: null,
        service_due: form.service_due || null,
        mot_due: form.mot_due || null,
        thorough_exam_due: form.thorough_exam_due || null,
        notes: form.notes || null,
      },
    });
    setShowModal(false);
  }

  function updateStatus(id: string, status: PlantStatus) {
    dispatch({ type: 'UPDATE_PLANT', id, updates: { status } });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Plant & Machinery</h1>
          <p className="text-sm mt-0.5" style={{ color: '#666666' }}>Fleet tracking, service & LOLER compliance</p>
        </div>
        <Btn onClick={openNew}><Plus className="w-4 h-4" /> Add Plant</Btn>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'On Site', value: plant.filter(p => p.status === 'on_site').length, color: '#FFD600' },
          { label: 'Available', value: plant.filter(p => p.status === 'available').length, color: '#4ade80' },
          { label: 'Workshop', value: plant.filter(p => p.status === 'maintenance').length, color: '#fb923c' },
          { label: 'Owned Fleet', value: plant.filter(p => p.owned).length, color: '#60a5fa' },
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
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-sm" style={{ color: '#444444' }}>No plant items found</p>
            ) : (
              <div className="space-y-2">
                {filtered.map(p => {
                  const alerts = getPlantAlerts(p);
                  return (
                    <div key={p.id} onClick={() => setSelected(selected === p.id ? null : p.id)} className={cn('flex items-center gap-3 p-3 rounded cursor-pointer transition-colors', selected === p.id ? 'ring-1 ring-[#FFD600]' : 'hover:bg-[#242424]')} style={{ backgroundColor: '#1c1c1c' }}>
                      <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#242424' }}>
                        {p.status === 'maintenance' ? <Wrench className="w-4 h-4" style={{ color: '#fb923c' }} /> : <Truck className="w-4 h-4" style={{ color: '#FFD600' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: '#e8e8e8' }}>{p.name}</span>
                          {alerts.length > 0 && <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#fb923c' }} />}
                          {!p.owned && <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: '#1a1a2e', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>HIRE</span>}
                        </div>
                        <div className="text-xs" style={{ color: '#666666' }}>
                          {p.make} {p.model} {p.year && `(${p.year})`} · {p.registration ?? 'No Reg'}
                        </div>
                      </div>
                      <Badge status={p.status} />
                      {p.current_job && (
                        <div className="text-xs text-right hidden md:block" style={{ color: '#444444', fontFamily: "'DM Mono', monospace" }}>
                          <div>Current Job</div>
                          <div className="truncate max-w-[120px]">{p.current_job.title}</div>
                        </div>
                      )}
                      {p.daily_rate && (
                        <div className="text-sm text-right flex-shrink-0 hidden lg:block" style={{ color: '#888888', fontFamily: "'DM Mono', monospace" }}>
                          {formatCurrency(p.daily_rate)}/d
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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

                <div>
                  <div className="text-xs font-mono uppercase tracking-wider mb-2" style={{ color: '#444444' }}>Update Status</div>
                  <div className="flex flex-wrap gap-1.5">
                    {PLANT_STATUSES.filter(s => s !== 'decommissioned').map(s => (
                      <button key={s} onClick={() => updateStatus(selectedPlant.id, s)} className="px-2.5 py-1 rounded text-xs font-mono uppercase transition-colors" style={selectedPlant.status === s ? { backgroundColor: '#FFD600', color: '#0c0c0c', fontWeight: 700 } : { backgroundColor: '#1c1c1c', color: '#666666', border: '1px solid #2a2a2a' }}>
                        {s.replace('_', ' ')}
                      </button>
                    ))}
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
                        <AlertTriangle className="w-3 h-3" />{w}
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
              </div>
            </Panel>
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Plant Item">
        <div className="space-y-4">
          <Field label="Name / Description" required>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 13T Tracked Excavator" />
            {errors.name && <p className="mt-1 text-xs" style={{ color: '#ff4444' }}>{errors.name}</p>}
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Make">
              <Input value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} placeholder="e.g. Caterpillar" />
            </Field>
            <Field label="Model">
              <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="e.g. 313" />
            </Field>
            <Field label="Year">
              <Input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2021" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Registration">
              <Input value={form.registration} onChange={e => setForm(f => ({ ...f, registration: e.target.value }))} placeholder="e.g. BM21 XYZ" />
            </Field>
            <Field label="Category">
              <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Excavator" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Daily Rate (£)">
              <Input type="number" value={form.daily_rate} onChange={e => setForm(f => ({ ...f, daily_rate: e.target.value }))} placeholder="0.00" />
            </Field>
            <Field label="Ownership">
              <Select value={form.owned ? 'owned' : 'hired'} onChange={e => setForm(f => ({ ...f, owned: e.target.value === 'owned' }))}>
                <option value="owned">Owned</option>
                <option value="hired">Hired In</option>
              </Select>
            </Field>
          </div>

          <div>
            <div className="text-xs font-mono uppercase tracking-wider mb-3" style={{ color: '#444444' }}>Compliance Dates</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Next Service Due">
                <Input type="date" value={form.service_due} onChange={e => setForm(f => ({ ...f, service_due: e.target.value }))} />
              </Field>
              <Field label="MOT Due">
                <Input type="date" value={form.mot_due} onChange={e => setForm(f => ({ ...f, mot_due: e.target.value }))} />
              </Field>
              <Field label="LOLER Exam Due" hint="LOLER Thorough Examination">
                <Input type="date" value={form.thorough_exam_due} onChange={e => setForm(f => ({ ...f, thorough_exam_due: e.target.value }))} />
              </Field>
            </div>
          </div>

          <Field label="Notes">
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any relevant notes..." rows={2} />
          </Field>

          <div className="flex gap-3 pt-2">
            <Btn className="flex-1 justify-center" onClick={handleSubmit}>Add to Fleet</Btn>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

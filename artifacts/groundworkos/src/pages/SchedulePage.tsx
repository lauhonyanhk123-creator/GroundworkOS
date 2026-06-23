import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, MapPin } from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { StatCard } from '../components/ui/StatCard';
import { Btn } from '../components/ui/Btn';
import { Modal, Field, Input, Select, Textarea } from '../components/ui/Modal';
import { useApp } from '../store/AppContext';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TYPE_COLORS: Record<string, string> = {
  site_work: '#1b5e78',
  delivery: '#1b5e78',
  inspection: '#fb923c',
  meeting: '#a78bfa',
  other: '#888888',
};

type EntryType = 'site_work' | 'delivery' | 'inspection' | 'meeting' | 'other';

const emptyForm = {
  title: '',
  job_id: '',
  type: 'site_work' as EntryType,
  date: new Date().toISOString().split('T')[0],
  time: '07:00',
  end_time: '17:00',
  crew_count: '1',
  foreman: '',
  plant_assigned: '',
  notes: '',
};

export function SchedulePage() {
  const { state, dispatch } = useApp();
  const { schedule, jobs } = state;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function getWeekBounds(date: Date) {
    const mon = new Date(date);
    const day = mon.getDay();
    mon.setDate(mon.getDate() - day + (day === 0 ? -6 : 1));
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);
    return { start: mon, end: sun };
  }

  function getWeekDays(date: Date): Date[] {
    const { start } = getWeekBounds(date);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }

  const weekDays = getWeekDays(currentDate);
  const today = new Date().toISOString().split('T')[0];
  const { start, end } = getWeekBounds(currentDate);

  const weekEntries = schedule.filter(e => {
    const d = new Date(e.start_datetime);
    return d >= start && d <= end;
  });

  const totalCrews = weekEntries.reduce((s, e) => s + e.crew_count, 0);
  const uniqueJobs = new Set(weekEntries.filter(e => e.job_id).map(e => e.job_id)).size;

  function prevWeek() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  }

  function nextWeek() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  }

  const weekLabel = `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  function openNew() {
    setForm(emptyForm);
    setErrors({});
    setShowModal(true);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const job = jobs.find(j => j.id === form.job_id);
    dispatch({
      type: 'ADD_SCHEDULE',
      entry: {
        id: crypto.randomUUID(),
        job_id: form.job_id || null,
        job: job ? { job_number: job.job_number, title: job.title, client: job.client ?? null } : null,
        title: form.title.trim(),
        start_datetime: `${form.date}T${form.time}:00`,
        end_datetime: `${form.date}T${form.end_time}:00`,
        crew_count: parseInt(form.crew_count) || 1,
        foreman: form.foreman || null,
        plant_assigned: form.plant_assigned || null,
        notes: form.notes || null,
        type: form.type,
      },
    });
    setShowModal(false);
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#181410', fontFamily: "'Space Grotesk', sans-serif" }}>Schedule</h1>
          <p className="text-sm mt-0.5" style={{ color: '#7a7469' }}>Crew & plant allocation</p>
        </div>
        <Btn onClick={openNew}><Plus className="w-4 h-4" /> Add Entry</Btn>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Weekly Entries" value={weekEntries.length} sub="Total scheduled items" />
        <StatCard label="Crews Deployed" value={totalCrews} sub="Total crew count" accent />
        <StatCard label="Active Sites" value={uniqueJobs} sub="Unique jobs this week" />
      </div>

      <Panel 
        title="Weekly Overview" 
        noPad 
        actions={
          <div className="flex items-center gap-2">
            <button onClick={prevWeek} className="p-1.5 rounded-md hover:bg-[#ece8e3] transition-colors" style={{ color: '#7a7469' }}><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium font-mono tnum" style={{ color: '#181410' }}>{weekLabel}</span>
            <button onClick={nextWeek} className="p-1.5 rounded-md hover:bg-[#ece8e3] transition-colors" style={{ color: '#7a7469' }}><ChevronRight className="w-4 h-4" /></button>
            <button onClick={() => setCurrentDate(new Date())} className="ml-2 px-2.5 py-1 text-xs rounded-md transition-colors hover:bg-[#eeeae4]" style={{ backgroundColor: '#f5f1ec', color: '#8a8377', border: '1px solid #d9d4ce', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>TODAY</button>
          </div>
        }
      >
        <div className="flex flex-col">
          <div className="grid" style={{ gridTemplateColumns: '72px repeat(7, 1fr)', backgroundColor: '#fafaf8', borderBottom: '1px solid #d9d4ce' }}>
            <div className="p-2" />
            {weekDays.map((day, i) => {
              const dateStr = day.toISOString().split('T')[0];
              const isToday = dateStr === today;
              const dayEntries = weekEntries.filter(e => e.start_datetime.startsWith(dateStr));
              return (
                <div key={i} className="p-2 text-center" style={{ borderLeft: '1px solid #d9d4ce', backgroundColor: isToday ? '#e8f3f7' : 'transparent' }}>
                  <div className="text-xs uppercase font-bold" style={{ color: isToday ? '#1b5e78' : '#7a7469', fontFamily: "'Space Grotesk', sans-serif" }}>{DAY_LABELS[i]}</div>
                  <div className="text-lg font-bold font-mono tnum" style={{ color: isToday ? '#1b5e78' : '#181410' }}>{day.getDate()}</div>
                  {dayEntries.length > 0 && (
                    <div className="flex justify-center mt-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isToday ? '#1b5e78' : '#7a7469' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="divide-y" style={{ borderColor: '#d9d4ce' }}>
            {weekDays.map((day, dayIdx) => {
              const dateStr = day.toISOString().split('T')[0];
              const dayEntries = weekEntries.filter(e => e.start_datetime.startsWith(dateStr));
              if (dayEntries.length === 0 && dateStr !== today) return null;

              return (
                <div key={dayIdx} className="grid" style={{ gridTemplateColumns: '72px 1fr' }}>
                  <div className="p-4 flex flex-col items-end justify-start" style={{ borderRight: '1px solid #d9d4ce', backgroundColor: '#fafaf8' }}>
                    <span className="text-xs font-bold uppercase" style={{ color: dateStr === today ? '#1b5e78' : '#7a7469', fontFamily: "'Space Grotesk', sans-serif" }}>
                      {DAY_LABELS[dayIdx % 7]}
                    </span>
                    <span className="text-sm font-mono tnum mt-0.5" style={{ color: dateStr === today ? '#1b5e78' : '#181410' }}>
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="p-3 space-y-2 bg-white">
                    {dayEntries.length === 0 ? (
                      <div className="text-xs py-3 text-center italic" style={{ color: '#a8a099' }}>No scheduled entries</div>
                    ) : dayEntries.map(entry => (
                      <div key={entry.id} className="flex items-start gap-4 p-3.5 rounded-lg transition-colors hover:bg-[#fafaf8] cursor-pointer group" style={{ border: '1px solid #d9d4ce', borderLeft: `3px solid ${TYPE_COLORS[entry.type] ?? '#7a7469'}` }}>
                        <div className="text-sm font-bold font-mono tnum flex-shrink-0 mt-0.5" style={{ color: '#181410' }}>
                          {new Date(entry.start_datetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="text-sm font-semibold truncate" style={{ color: '#181410' }}>{entry.title}</div>
                            <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(27,94,120,0.1)', color: '#1b5e78' }}>
                              {entry.type.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" style={{ color: '#7a7469' }}>
                            {entry.job && (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono tnum font-medium" style={{ color: '#4a4540' }}>{entry.job.job_number}</span>
                                {entry.job.client?.company_name && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider" style={{ backgroundColor: '#e8e4dd', color: '#4a4540' }}>
                                    {entry.job.client.company_name}
                                  </span>
                                )}
                              </div>
                            )}
                            {entry.crew_count > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="font-mono tnum font-medium" style={{ color: '#4a4540' }}>{entry.crew_count}</span> crew
                              </div>
                            )}
                            {entry.foreman && (
                              <div>FM: <span className="font-medium" style={{ color: '#4a4540' }}>{entry.foreman}</span></div>
                            )}
                            {entry.plant_assigned && (
                              <div>Plant: <span className="font-medium" style={{ color: '#4a4540' }}>{entry.plant_assigned}</span></div>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-2" style={{ color: '#7a7469' }} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      <div className="flex items-center justify-center gap-6 py-4">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
            <span style={{ color: '#7a7469' }}>{type.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Schedule Entry">
        <div className="space-y-4">
          <Field label="Title" required>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Drainage excavation — Phase 1" />
            {errors.title && <p className="mt-1 text-xs" style={{ color: '#c13a2a' }}>{errors.title}</p>}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as EntryType }))}>
                {Object.keys(TYPE_COLORS).map(t => (
                  <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </Select>
            </Field>
            <Field label="Related Job">
              <Select value={form.job_id} onChange={e => setForm(f => ({ ...f, job_id: e.target.value }))}>
                <option value="">None</option>
                {jobs.filter(j => j.status === 'active' || j.status === 'quoted').map(j => (
                  <option key={j.id} value={j.id}>{j.job_number} — {j.title}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Date">
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="font-mono tnum" />
            </Field>
            <Field label="Start Time">
              <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="font-mono tnum" />
            </Field>
            <Field label="End Time">
              <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="font-mono tnum" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Crew Count">
              <Input type="number" value={form.crew_count} onChange={e => setForm(f => ({ ...f, crew_count: e.target.value }))} min="1" className="font-mono tnum" />
            </Field>
            <Field label="Foreman">
              <Input value={form.foreman} onChange={e => setForm(f => ({ ...f, foreman: e.target.value }))} placeholder="e.g. Dave Walters" />
            </Field>
          </div>

          <Field label="Plant Assigned">
            <Input value={form.plant_assigned} onChange={e => setForm(f => ({ ...f, plant_assigned: e.target.value }))} placeholder="e.g. Cat 313 Excavator" />
          </Field>

          <Field label="Notes">
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any relevant notes..." rows={3} />
          </Field>

          <div className="flex gap-3 pt-2">
            <Btn className="flex-1 justify-center" onClick={handleSubmit}>Add to Schedule</Btn>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

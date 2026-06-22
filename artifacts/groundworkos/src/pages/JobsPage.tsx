import { useState } from 'react';
import { Plus, Search, Filter, Download, Briefcase, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { Btn } from '../components/ui/Btn';
import { Modal, Field, Input, Select, Textarea } from '../components/ui/Modal';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { useApp, nextJobNumber } from '../store/AppContext';
import type { JobType, JobStatus } from '../types';

const YELLOW = '#FFD600';
const GREEN = '#4ade80';
const BLUE = '#60a5fa';
const ORANGE = '#fb923c';
const RED = '#ff4444';

const TABS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'enquiry', label: 'Enquiry' },
  { id: 'quoted', label: 'Quoted' },
  { id: 'active', label: 'Active' },
  { id: 'complete', label: 'Complete' },
];

const JOB_TYPES: JobType[] = ['drainage', 'foundations', 'excavation', 'kerbing', 'sewers', 'reinstatement', 'piling', 'subbase', 'utilities', 'groundworks'];
const JOB_STATUSES: JobStatus[] = ['enquiry', 'quoted', 'active', 'on_hold', 'complete', 'cancelled'];

const emptyForm = {
  title: '', client_id: '', type: '' as JobType | '',
  site_address: '', value: '', start_date: '', end_date: '',
  foreman: '', crew_count: '', nrswa_required: false,
  permit_number: '', description: '', status: 'enquiry' as JobStatus,
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-2.5 py-1.5 rounded text-xs" style={{ backgroundColor: '#1c1c1c', border: '1px solid #3a3a3a', fontFamily: "'DM Mono', monospace" }}>
      <div style={{ color: '#888888' }}>{label}</div>
      <div style={{ color: '#e8e8e8' }}>{formatCurrency(payload[0].value)}</div>
    </div>
  );
};

export function JobsPage() {
  const { state, dispatch } = useApp();
  const { jobs, clients } = state;

  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [filterTypes, setFilterTypes] = useState<JobType[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = jobs.filter(j => {
    if (activeTab !== 'all' && j.status !== activeTab) return false;
    if (filterTypes.length > 0 && !filterTypes.includes(j.type as JobType)) return false;
    if (search) {
      const q = search.toLowerCase();
      return j.title.toLowerCase().includes(q) || j.job_number.toLowerCase().includes(q) || (j.client?.company_name ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  const activeJobs = jobs.filter(j => j.status === 'active');
  const totalActiveValue = activeJobs.reduce((s, j) => s + (j.value ?? 0), 0);
  const completedJobs = jobs.filter(j => j.status === 'complete');
  const avgProgress = activeJobs.length ? Math.round(activeJobs.reduce((s, j) => s + (j.progress_percent ?? 0), 0) / activeJobs.length) : 0;

  const typeChartData = JOB_TYPES.map(t => ({
    name: t.charAt(0).toUpperCase() + t.slice(1),
    value: jobs.filter(j => j.type === t).reduce((s, j) => s + (j.value ?? 0), 0),
  })).filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);

  const TYPE_COLORS = [YELLOW, GREEN, BLUE, ORANGE, '#a78bfa', '#f472b6'];

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
    const client = clients.find(c => c.id === form.client_id);
    dispatch({
      type: 'ADD_JOB',
      job: {
        id: crypto.randomUUID(),
        job_number: nextJobNumber(jobs),
        title: form.title.trim(),
        client_id: form.client_id || null,
        client: client ? { company_name: client.company_name } : null,
        type: (form.type as JobType) || null,
        site_address: form.site_address || null,
        value: form.value ? parseFloat(form.value) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status,
        progress_percent: 0,
        description: form.description || null,
        created_at: new Date().toISOString(),
        foreman: form.foreman || null,
        crew_count: form.crew_count ? parseInt(form.crew_count) : null,
        nrswa_required: form.nrswa_required,
        permit_number: form.permit_number || null,
      },
    });
    setShowModal(false);
  }

  function handleExport() {
    const headers = ['Job No', 'Title', 'Client', 'Type', 'Status', 'Value', 'Progress', 'Start Date'];
    const rows = filtered.map(j => [j.job_number, j.title, j.client?.company_name ?? '', j.type ?? '', j.status, (j.value ?? 0).toFixed(2), j.progress_percent, j.start_date ?? '']);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `jobs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  function updateStatus(id: string, status: JobStatus) {
    dispatch({ type: 'UPDATE_JOB', id, updates: { status } });
  }

  function updateProgress(id: string, progress_percent: number) {
    dispatch({ type: 'UPDATE_JOB', id, updates: { progress_percent } });
  }

  const selectedJob = selected ? jobs.find(j => j.id === selected) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Jobs</h1>
          <p className="text-sm mt-0.5" style={{ color: '#666666' }}>{jobs.length} jobs total</p>
        </div>
        <Btn onClick={openNew}><Plus className="w-4 h-4" /> New Job</Btn>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Active Jobs', value: activeJobs.length, sub: formatCurrency(totalActiveValue), color: GREEN, icon: <Clock className="w-4 h-4" /> },
          { label: 'Avg Progress', value: `${avgProgress}%`, sub: `across ${activeJobs.length} active`, color: YELLOW, icon: <TrendingUp className="w-4 h-4" /> },
          { label: 'Completed', value: completedJobs.length, sub: formatCurrency(completedJobs.reduce((s, j) => s + (j.value ?? 0), 0)), color: BLUE, icon: <CheckCircle className="w-4 h-4" /> },
          { label: 'Total Pipeline', value: formatCurrency(jobs.filter(j => j.status !== 'cancelled').reduce((s, j) => s + (j.value ?? 0), 0)), sub: `${jobs.filter(j => j.status !== 'cancelled').length} live jobs`, color: ORANGE, icon: <Briefcase className="w-4 h-4" /> },
        ].map(({ label, value, sub, color, icon }) => (
          <div key={label} className="p-3 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#555555' }}>{label}</span>
              <span style={{ color, opacity: 0.6 }}>{icon}</span>
            </div>
            <div className="text-2xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{value}</div>
            <div className="text-xs font-mono mt-0.5" style={{ color: '#555555' }}>{sub}</div>
          </div>
        ))}
      </div>

      {typeChartData.length > 0 && (
        <Panel title="Value by Job Type">
          <div style={{ height: 110 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeChartData} barCategoryGap="25%">
                <XAxis dataKey="name" tick={{ fill: '#555555', fontSize: 10, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#555555', fontSize: 10, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '' : `£${(v / 1000).toFixed(0)}k`} width={38} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="value" name="Value" radius={[2, 2, 0, 0]}>
                  {typeChartData.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      <div className="flex items-center gap-1 p-1 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="px-4 py-1.5 rounded text-sm transition-colors" style={activeTab === tab.id ? { backgroundColor: YELLOW, color: '#0c0c0c', fontWeight: 700 } : { color: '#666666' }}>
            {tab.label}{tab.id !== 'all' && <span className="text-xs opacity-60 ml-1">({jobs.filter(j => j.status === tab.id).length})</span>}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#444444' }} />
            <input type="text" placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-1.5 rounded text-sm w-56 focus:outline-none" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a', color: '#e8e8e8', fontFamily: "'DM Mono', monospace" }} onFocus={e => (e.target.style.borderColor = YELLOW)} onBlur={e => (e.target.style.borderColor = '#2a2a2a')} />
          </div>
          <Btn variant="ghost" size="sm" onClick={() => setShowFilters(f => !f)}>
            <Filter className="w-3.5 h-3.5" /> Filter{filterTypes.length > 0 && <span className="w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold" style={{ backgroundColor: YELLOW, color: '#0c0c0c' }}>{filterTypes.length}</span>}
          </Btn>
        </div>
        <Btn variant="ghost" size="sm" onClick={handleExport}><Download className="w-3.5 h-3.5" /> Export</Btn>
      </div>

      {showFilters && (
        <div className="p-3 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#444444' }}>Filter by Type</span>
            {filterTypes.length > 0 && <button className="text-xs" style={{ color: YELLOW }} onClick={() => setFilterTypes([])}>Clear</button>}
          </div>
          <div className="flex flex-wrap gap-2">
            {JOB_TYPES.map(t => (
              <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="checkbox" checked={filterTypes.includes(t)} onChange={e => setFilterTypes(prev => e.target.checked ? [...prev, t] : prev.filter(v => v !== t))} className="accent-yellow-400" />
                <span style={{ color: '#888888' }} className="capitalize">{t}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={selectedJob ? 'xl:col-span-2' : 'xl:col-span-3'}>
          <Panel>
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-sm" style={{ color: '#444444' }}>No jobs found</p>
            ) : (
              <div className="space-y-2">
                {filtered.map(job => (
                  <div key={job.id} onClick={() => setSelected(selected === job.id ? null : job.id)} className={cn('flex items-center gap-3 p-3 rounded cursor-pointer transition-colors', selected === job.id ? 'ring-1 ring-[#FFD600]' : 'hover:bg-[#242424]')} style={{ backgroundColor: '#1c1c1c' }}>
                    <span className="text-xs font-mono w-24 flex-shrink-0" style={{ color: '#444444' }}>{job.job_number}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: '#e8e8e8' }}>{job.title}</div>
                      <div className="text-xs truncate" style={{ color: '#444444' }}>{job.client?.company_name ?? '—'}</div>
                    </div>
                    <span className="text-xs uppercase tracking-wide hidden sm:block" style={{ color: '#444444', fontFamily: "'DM Mono', monospace", minWidth: '80px' }}>{job.type ?? '—'}</span>
                    <Badge status={job.status} />
                    <span className="text-sm hidden md:block" style={{ color: '#e8e8e8', fontFamily: "'DM Mono', monospace", minWidth: '80px', textAlign: 'right' }}>{job.value ? formatCurrency(job.value) : '—'}</span>
                    {job.status === 'active' && (
                      <div className="w-20 hidden lg:flex flex-col flex-shrink-0">
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#242424' }}>
                          <div className="h-full rounded-full" style={{ width: `${job.progress_percent}%`, backgroundColor: YELLOW }} />
                        </div>
                        <div className="text-xs text-right mt-0.5" style={{ color: '#444444', fontFamily: "'DM Mono', monospace" }}>{job.progress_percent}%</div>
                      </div>
                    )}
                    {job.nrswa_required && <span className="px-1.5 py-0.5 rounded text-xs font-mono hidden xl:block" style={{ backgroundColor: '#1a1400', color: YELLOW, border: '1px solid rgba(255,214,0,0.3)' }}>NRSWA</span>}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {selectedJob && (
          <div>
            <Panel title={selectedJob.job_number} actions={<button onClick={() => setSelected(null)} className="text-xs font-mono" style={{ color: '#666666' }}>✕</button>}>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#e8e8e8' }}>{selectedJob.title}</h3>
                  <div className="mt-1"><Badge status={selectedJob.status} /></div>
                </div>

                <div>
                  <div className="text-xs font-mono uppercase tracking-wider mb-2" style={{ color: '#444444' }}>Update Status</div>
                  <div className="flex flex-wrap gap-1.5">
                    {JOB_STATUSES.map(s => (
                      <button key={s} onClick={() => updateStatus(selectedJob.id, s)} className="px-2.5 py-1 rounded text-xs font-mono uppercase transition-colors" style={selectedJob.status === s ? { backgroundColor: YELLOW, color: '#0c0c0c', fontWeight: 700 } : { backgroundColor: '#1c1c1c', color: '#666666', border: '1px solid #2a2a2a' }}>
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedJob.status === 'active' && (
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider mb-2" style={{ color: '#444444' }}>Progress: {selectedJob.progress_percent}%</div>
                    <input type="range" min="0" max="100" step="5" value={selectedJob.progress_percent} onChange={e => updateProgress(selectedJob.id, parseInt(e.target.value))} className="w-full accent-yellow-400 cursor-pointer" />
                    <div className="mt-1.5 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#242424' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${selectedJob.progress_percent}%`, backgroundColor: YELLOW }} />
                    </div>
                  </div>
                )}

                {[
                  { label: 'Client', value: selectedJob.client?.company_name ?? '—' },
                  { label: 'Type', value: selectedJob.type ?? '—' },
                  { label: 'Site', value: selectedJob.site_address ?? '—' },
                  { label: 'Value', value: selectedJob.value ? formatCurrency(selectedJob.value) : '—' },
                  { label: 'Start Date', value: formatDate(selectedJob.start_date) },
                  { label: 'Foreman', value: selectedJob.foreman ?? '—' },
                  { label: 'Crew', value: selectedJob.crew_count ? `${selectedJob.crew_count} operatives` : '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#444444' }}>{label}</span>
                    <p className="text-sm mt-0.5 capitalize" style={{ color: '#e8e8e8' }}>{value}</p>
                  </div>
                ))}

                {selectedJob.nrswa_required && (
                  <div className="p-2.5 rounded" style={{ backgroundColor: '#1a1400', border: '1px solid rgba(255,214,0,0.2)' }}>
                    <div className="text-xs font-mono font-bold" style={{ color: YELLOW }}>NRSWA Street Works</div>
                    <div className="text-xs mt-0.5" style={{ color: '#888888' }}>Permit: {selectedJob.permit_number ?? '—'}</div>
                  </div>
                )}

                {selectedJob.description && (
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#444444' }}>Description</span>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#888888' }}>{selectedJob.description}</p>
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Job">
        <div className="space-y-4">
          <Field label="Job Title" required>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Drainage Installation - Plot 12" />
            {errors.title && <p className="mt-1 text-xs" style={{ color: RED }}>{errors.title}</p>}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as JobStatus }))}>
                {JOB_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </Select>
            </Field>
            <Field label="Type">
              <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as JobType }))}>
                <option value="">Select type...</option>
                {JOB_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Client">
            <Select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
              <option value="">Select client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </Select>
          </Field>

          <Field label="Site Address">
            <Input value={form.site_address} onChange={e => setForm(f => ({ ...f, site_address: e.target.value }))} placeholder="e.g. Longbridge Lane, Birmingham, B31 4SX" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Contract Value (£)">
              <Input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0.00" />
            </Field>
            <Field label="Crew Count">
              <Input type="number" value={form.crew_count} onChange={e => setForm(f => ({ ...f, crew_count: e.target.value }))} placeholder="0" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date">
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </Field>
            <Field label="End Date">
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </Field>
          </div>

          <Field label="Foreman">
            <Input value={form.foreman} onChange={e => setForm(f => ({ ...f, foreman: e.target.value }))} placeholder="e.g. Dave Walters" />
          </Field>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={form.nrswa_required} onChange={e => setForm(f => ({ ...f, nrswa_required: e.target.checked }))} className="w-4 h-4 accent-yellow-400" />
              <span className="text-sm" style={{ color: '#888888' }}>NRSWA Street Works required</span>
            </label>
          </div>

          {form.nrswa_required && (
            <Field label="Permit Number">
              <Input value={form.permit_number} onChange={e => setForm(f => ({ ...f, permit_number: e.target.value }))} placeholder="e.g. BCC-2024-0892" />
            </Field>
          )}

          <Field label="Description">
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Scope of works..." rows={3} />
          </Field>

          <div className="flex gap-3 pt-2">
            <Btn className="flex-1 justify-center" onClick={handleSubmit}>Create Job</Btn>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

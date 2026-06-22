import { useState } from 'react';
import { Plus, Search, Filter, Download, X } from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { Btn } from '../components/ui/Btn';
import { Modal, Field, Input, Select, Textarea } from '../components/ui/Modal';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { useApp, nextJobNumber } from '../store/AppContext';
import type { JobType, JobStatus } from '../types';

const YELLOW = '#3db56d';
const RED = '#e03a3a';

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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#e2e2e2' }}>Jobs</h1>
          <p className="text-sm mt-0.5" style={{ color: '#5a5a5a' }}>{jobs.length} total</p>
        </div>
        <Btn onClick={openNew}><Plus className="w-4 h-4" /> New Job</Btn>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1" style={{ borderBottom: '1px solid #1a1a1a' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2.5 text-sm transition-colors relative"
              style={activeTab === tab.id
                ? { color: '#e2e2e2', fontWeight: 500, borderBottom: '2px solid #e2e2e2', marginBottom: '-1px' }
                : { color: '#5a5a5a' }}
            >
              {tab.label}
              {tab.id !== 'all' && (
                <span className="text-xs ml-1.5" style={{ color: activeTab === tab.id ? '#7a7a7a' : '#3a3a3a' }}>
                  {jobs.filter(j => j.status === tab.id).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#3a3a3a' }} />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 rounded-md text-sm w-48 focus:outline-none transition-colors"
              style={{ backgroundColor: '#111111', border: '1px solid #1a1a1a', color: '#e2e2e2' }}
              onFocus={e => (e.target.style.borderColor = '#2a2a2a')}
              onBlur={e => (e.target.style.borderColor = '#1a1a1a')}
            />
          </div>
          <Btn variant="ghost" size="sm" onClick={() => setShowFilters(f => !f)}>
            <Filter className="w-3.5 h-3.5" />
            {filterTypes.length > 0 && <span className="w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold" style={{ backgroundColor: '#2a2a2a', color: '#e2e2e2' }}>{filterTypes.length}</span>}
          </Btn>
          <Btn variant="ghost" size="sm" onClick={handleExport}><Download className="w-3.5 h-3.5" /></Btn>
        </div>
      </div>

      {showFilters && (
        <div className="p-4 rounded-lg" style={{ backgroundColor: '#111111', border: '1px solid #1a1a1a' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-widest" style={{ color: '#5a5a5a', letterSpacing: '0.08em' }}>Filter by type</span>
            {filterTypes.length > 0 && <button className="text-xs" style={{ color: '#7a7a7a' }} onClick={() => setFilterTypes([])}>Clear</button>}
          </div>
          <div className="flex flex-wrap gap-3">
            {JOB_TYPES.map(t => (
              <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={filterTypes.includes(t)} onChange={e => setFilterTypes(prev => e.target.checked ? [...prev, t] : prev.filter(v => v !== t))} className="accent-yellow-400" />
                <span style={{ color: '#7a7a7a' }} className="capitalize">{t}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={selectedJob ? 'xl:col-span-2' : 'xl:col-span-3'}>
          <Panel noPad>
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-sm" style={{ color: '#3a3a3a' }}>No jobs found</p>
            ) : filtered.map((job, i) => (
              <div
                key={job.id}
                onClick={() => setSelected(selected === job.id ? null : job.id)}
                className="flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors hover:bg-[#161616]"
                style={{
                  borderBottom: i < filtered.length - 1 ? '1px solid #1a1a1a' : 'none',
                  backgroundColor: selected === job.id ? '#161616' : undefined,
                  borderLeft: selected === job.id ? '2px solid #e2e2e2' : '2px solid transparent',
                }}
              >
                <span className="text-xs w-24 flex-shrink-0" style={{ color: '#5a5a5a', fontFamily: "'DM Mono', monospace" }}>{job.job_number}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: '#e2e2e2' }}>{job.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#5a5a5a' }}>{job.client?.company_name ?? '—'} {job.type ? `· ${job.type}` : ''}</div>
                </div>
                <Badge status={job.status} />
                <span className="text-sm hidden md:block flex-shrink-0" style={{ color: '#e2e2e2', fontFamily: "'DM Mono', monospace", minWidth: '80px', textAlign: 'right' }}>
                  {job.value ? formatCurrency(job.value) : '—'}
                </span>
                {job.status === 'active' && (
                  <div className="w-16 hidden lg:block flex-shrink-0">
                    <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#1f1f1f' }}>
                      <div className="h-full rounded-full" style={{ width: `${job.progress_percent}%`, backgroundColor: '#3db56d' }} />
                    </div>
                    <div className="text-xs text-right mt-1" style={{ color: '#5a5a5a', fontFamily: "'DM Mono', monospace" }}>{job.progress_percent}%</div>
                  </div>
                )}
              </div>
            ))}
          </Panel>
        </div>

        {selectedJob && (
          <div>
            <Panel actions={
              <button onClick={() => setSelected(null)} style={{ color: '#5a5a5a' }}><X className="w-4 h-4" /></button>
            }>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: '#5a5a5a', fontFamily: "'DM Mono', monospace" }}>{selectedJob.job_number}</span>
                    <Badge status={selectedJob.status} />
                  </div>
                  <h3 className="text-base font-semibold leading-snug" style={{ color: '#e2e2e2' }}>{selectedJob.title}</h3>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-widest mb-2.5" style={{ color: '#5a5a5a', letterSpacing: '0.08em' }}>Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {JOB_STATUSES.map(s => (
                      <button
                        key={s}
                        onClick={() => updateStatus(selectedJob.id, s)}
                        className="px-2.5 py-1 rounded text-xs transition-colors capitalize"
                        style={selectedJob.status === s
                          ? { backgroundColor: '#e2e2e2', color: '#0a0a0a', fontWeight: 600 }
                          : { backgroundColor: '#181818', color: '#5a5a5a', border: '1px solid #222' }}
                      >
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedJob.status === 'active' && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest mb-2.5" style={{ color: '#5a5a5a', letterSpacing: '0.08em' }}>Progress — {selectedJob.progress_percent}%</p>
                    <input type="range" min="0" max="100" step="5" value={selectedJob.progress_percent} onChange={e => updateProgress(selectedJob.id, parseInt(e.target.value))} className="w-full accent-yellow-400 cursor-pointer" />
                    <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#1f1f1f' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${selectedJob.progress_percent}%`, backgroundColor: '#3db56d' }} />
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-1" style={{ borderTop: '1px solid #1a1a1a' }}>
                  {[
                    { label: 'Client', value: selectedJob.client?.company_name ?? '—' },
                    { label: 'Type', value: selectedJob.type ?? '—' },
                    { label: 'Site', value: selectedJob.site_address ?? '—' },
                    { label: 'Value', value: selectedJob.value ? formatCurrency(selectedJob.value) : '—' },
                    { label: 'Start', value: formatDate(selectedJob.start_date) },
                    { label: 'Foreman', value: selectedJob.foreman ?? '—' },
                    { label: 'Crew', value: selectedJob.crew_count ? `${selectedJob.crew_count} ops` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-baseline gap-3 pt-3" style={{ borderTop: '1px solid #141414' }}>
                      <span className="text-xs" style={{ color: '#5a5a5a', flexShrink: 0 }}>{label}</span>
                      <span className="text-sm text-right capitalize" style={{ color: '#e2e2e2' }}>{value}</span>
                    </div>
                  ))}
                </div>

                {selectedJob.nrswa_required && (
                  <div className="p-3 rounded-md text-xs" style={{ backgroundColor: '#181818', border: '1px solid #222' }}>
                    <div className="font-semibold mb-0.5" style={{ color: '#4d90d4' }}>NRSWA Street Works</div>
                    <div style={{ color: '#5a5a5a' }}>Permit: {selectedJob.permit_number ?? '—'}</div>
                  </div>
                )}

                {selectedJob.description && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#5a5a5a', letterSpacing: '0.08em' }}>Description</p>
                    <p className="text-sm leading-relaxed" style={{ color: '#7a7a7a' }}>{selectedJob.description}</p>
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
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Drainage Installation — Plot 12" />
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
              <span className="text-sm" style={{ color: '#7a7a7a' }}>NRSWA Street Works required</span>
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

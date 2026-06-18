import { useState } from 'react';
import { Link } from 'wouter';
import { Plus, Search, Filter, Download } from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { Btn } from '../components/ui/Btn';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { JOBS } from '../data/mock';
import type { JobStatus, JobType } from '../types';

const TABS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'enquiry', label: 'Enquiry' },
  { id: 'quoted', label: 'Quoted' },
  { id: 'active', label: 'Active' },
  { id: 'complete', label: 'Complete' },
];

const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: 'drainage', label: 'Drainage' },
  { value: 'foundations', label: 'Foundations' },
  { value: 'excavation', label: 'Excavation' },
  { value: 'kerbing', label: 'Kerbing' },
  { value: 'sewers', label: 'Sewers' },
  { value: 'reinstatement', label: 'Reinstatement' },
  { value: 'piling', label: 'Piling' },
  { value: 'subbase', label: 'Subbase' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'groundworks', label: 'Groundworks' },
];

export function JobsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [filterTypes, setFilterTypes] = useState<JobType[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = JOBS.filter(j => {
    if (activeTab !== 'all' && j.status !== activeTab) return false;
    if (filterTypes.length > 0 && !filterTypes.includes(j.type as JobType)) return false;
    if (search) {
      const q = search.toLowerCase();
      return j.title.toLowerCase().includes(q) || j.job_number.toLowerCase().includes(q) || (j.client?.company_name ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  function handleExport() {
    const headers = ['Job No', 'Title', 'Client', 'Type', 'Status', 'Value', 'Progress', 'Start Date'];
    const rows = filtered.map(j => [j.job_number, j.title, j.client?.company_name ?? '', j.type ?? '', j.status, (j.value ?? 0).toFixed(2), j.progress_percent, j.start_date ?? '']);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `jobs-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  const selectedJob = selected ? JOBS.find(j => j.id === selected) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Jobs</h1>
          <p className="text-sm mt-0.5" style={{ color: '#666666' }}>Manage all groundwork projects</p>
        </div>
        <Btn><Plus className="w-4 h-4" /> New Job</Btn>
      </div>

      <div className="flex items-center gap-1 p-1 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn('px-4 py-1.5 rounded text-sm transition-colors', activeTab === tab.id ? 'font-bold' : '')} style={activeTab === tab.id ? { backgroundColor: '#FFD600', color: '#0c0c0c' } : { color: '#666666' }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#444444' }} />
            <input type="text" placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-1.5 rounded text-sm w-56 focus:outline-none" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a', color: '#e8e8e8', fontFamily: "'DM Mono', monospace" }} onFocus={e => (e.target.style.borderColor = '#FFD600')} onBlur={e => (e.target.style.borderColor = '#2a2a2a')} />
          </div>
          <Btn variant="ghost" size="sm" onClick={() => setShowFilters(f => !f)}>
            <Filter className="w-3.5 h-3.5" /> Filter{filterTypes.length > 0 && <span className="w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold" style={{ backgroundColor: '#FFD600', color: '#0c0c0c' }}>{filterTypes.length}</span>}
          </Btn>
        </div>
        <Btn variant="ghost" size="sm" onClick={handleExport}><Download className="w-3.5 h-3.5" /> Export</Btn>
      </div>

      {showFilters && (
        <div className="p-3 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#444444' }}>Filter by Type</span>
            {filterTypes.length > 0 && <button className="text-xs" style={{ color: '#FFD600' }} onClick={() => setFilterTypes([])}>Clear</button>}
          </div>
          <div className="flex flex-wrap gap-2">
            {JOB_TYPES.map(t => (
              <label key={t.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="checkbox" checked={filterTypes.includes(t.value)} onChange={e => setFilterTypes(prev => e.target.checked ? [...prev, t.value] : prev.filter(v => v !== t.value))} className="accent-yellow-400" />
                <span style={{ color: '#888888' }}>{t.label}</span>
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
                  <div key={job.id} onClick={() => setSelected(selected === job.id ? null : job.id)} className={cn('flex items-center gap-3 p-3 rounded cursor-pointer transition-colors', selected === job.id ? 'ring-1' : 'hover:bg-[#1c1c1c]')} style={selected === job.id ? { backgroundColor: '#1c1c1c', outlineColor: '#FFD600' } : { backgroundColor: '#1c1c1c' }}>
                    <span className="text-xs font-mono w-24 flex-shrink-0" style={{ color: '#444444' }}>{job.job_number}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: '#e8e8e8' }}>{job.title}</div>
                      <div className="text-xs truncate" style={{ color: '#444444' }}>{job.client?.company_name ?? '—'}</div>
                    </div>
                    <span className="text-xs uppercase tracking-wide hidden sm:block" style={{ color: '#444444', fontFamily: "'DM Mono', monospace", minWidth: '80px' }}>{job.type ?? '—'}</span>
                    <Badge status={job.status} />
                    <span className="text-sm hidden md:block" style={{ color: '#e8e8e8', fontFamily: "'DM Mono', monospace", minWidth: '80px', textAlign: 'right' }}>{job.value ? formatCurrency(job.value) : '—'}</span>
                    {job.status === 'active' && (
                      <div className="w-20 hidden lg:block flex-shrink-0">
                        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#242424' }}>
                          <div className="h-full rounded-full" style={{ width: `${job.progress_percent}%`, backgroundColor: '#FFD600' }} />
                        </div>
                        <div className="text-xs text-right mt-0.5" style={{ color: '#444444', fontFamily: "'DM Mono', monospace" }}>{job.progress_percent}%</div>
                      </div>
                    )}
                    {job.nrswa_required && (
                      <span className="px-1.5 py-0.5 rounded text-xs font-mono hidden xl:block" style={{ backgroundColor: '#1a1400', color: '#FFD600', border: '1px solid rgba(255,214,0,0.3)' }}>NRSWA</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {selectedJob && (
          <div className="xl:col-span-1">
            <Panel title={selectedJob.job_number} actions={<button onClick={() => setSelected(null)} className="text-xs font-mono" style={{ color: '#666666' }}>✕</button>}>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#e8e8e8' }}>{selectedJob.title}</h3>
                  <div className="mt-1"><Badge status={selectedJob.status} /></div>
                </div>
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
                    <p className="text-sm mt-0.5" style={{ color: '#e8e8e8' }}>{value}</p>
                  </div>
                ))}
                {selectedJob.nrswa_required && (
                  <div className="p-2.5 rounded" style={{ backgroundColor: '#1a1400', border: '1px solid rgba(255,214,0,0.2)' }}>
                    <div className="text-xs font-mono font-bold" style={{ color: '#FFD600' }}>NRSWA Street Works</div>
                    <div className="text-xs mt-0.5" style={{ color: '#888888' }}>Permit: {selectedJob.permit_number ?? '—'}</div>
                  </div>
                )}
                {selectedJob.status === 'active' && (
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#444444' }}>Progress</span>
                    <div className="mt-1.5 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#242424' }}>
                      <div className="h-full rounded-full" style={{ width: `${selectedJob.progress_percent}%`, backgroundColor: '#FFD600' }} />
                    </div>
                    <div className="text-right text-xs mt-0.5" style={{ color: '#888888', fontFamily: "'DM Mono', monospace" }}>{selectedJob.progress_percent}%</div>
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
    </div>
  );
}

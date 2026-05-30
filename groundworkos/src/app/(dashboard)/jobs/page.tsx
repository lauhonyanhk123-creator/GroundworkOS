'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Filter, Download } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Job } from '@/types';

type JobRow = Job & { client: { company_name: string } | null };

interface NewJobForm {
  client_id: string;
  title: string;
  type: string;
  site_address: string;
  value: string;
  start_date: string;
  description: string;
}

const EMPTY_FORM: NewJobForm = {
  client_id: '', title: '', type: '', site_address: '', value: '', start_date: '', description: '',
};

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'quoted', label: 'Quoted' },
  { id: 'complete', label: 'Complete' },
];

export default function JobsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<NewJobForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const supabase = useRef(createClient());

  async function loadJobs() {
    try {
      const { data, error } = await supabase.current
        .from('jobs')
        .select('*, client:clients(company_name)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setJobs((data ?? []) as JobRow[]);
    } catch (err) {
      console.error('[Jobs]', err);
      setError('Failed to load jobs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    async function loadClients() {
      const { data } = await supabase.current
        .from('clients')
        .select('id, company_name')
        .order('company_name');
      setClients(data ?? []);
    }
    loadJobs();
    loadClients();
  }, []);

  async function handleCreateJob() {
    if (!form.title.trim()) { setFormError('Job title is required.'); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      const { data: { user } } = await supabase.current.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: uc } = await supabase.current
        .from('user_companies').select('company_id').eq('user_id', user.id).single();
      if (!uc?.company_id) throw new Error('No company found');

      const { data: jobNumber } = await supabase.current.rpc('generate_job_number');

      const { error } = await supabase.current.from('jobs').insert({
        company_id: uc.company_id,
        job_number: jobNumber,
        client_id: form.client_id || null,
        title: form.title.trim(),
        type: form.type || null,
        site_address: form.site_address || null,
        value: form.value ? parseFloat(form.value) : null,
        start_date: form.start_date || null,
        description: form.description || null,
        status: 'enquiry',
      });
      if (error) throw error;
      setShowNewJobModal(false);
      setForm(EMPTY_FORM);
      await loadJobs();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create job. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredJobs = jobs.filter(job => {
    const matchesTab = activeTab === 'all' || job.status === activeTab;
    const clientName = job.client?.company_name ?? '';
    const matchesSearch = searchQuery === '' ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.job_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterTypes.length === 0 || filterTypes.includes(job.type ?? '');
    return matchesTab && matchesSearch && matchesType;
  });

  function handleExport() {
    const headers = ['Job Number', 'Title', 'Client', 'Type', 'Status', 'Value (£)', 'Progress %', 'Created'];
    const rows = filteredJobs.map(job => [
      job.job_number,
      job.title,
      job.client?.company_name ?? '',
      job.type ?? '',
      job.status,
      (job.value ?? 0).toFixed(2),
      job.progress_percent ?? 0,
      new Date(job.created_at).toLocaleDateString('en-GB'),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const JOB_TYPES = [
    { value: 'drainage', label: 'Drainage' },
    { value: 'foundations', label: 'Foundations' },
    { value: 'excavation', label: 'Excavation' },
    { value: 'kerbing', label: 'Kerbing' },
    { value: 'sewers', label: 'Sewers' },
    { value: 'reinstatement', label: 'Reinstatement' },
  ];

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-danger mb-2">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => { setError(null); setIsLoading(true); loadJobs(); }}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-condensed font-bold">Jobs</h1>
          <p className="text-muted text-sm mt-1">Manage all your groundwork projects</p>
        </div>
        <Button onClick={() => setShowNewJobModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Job
        </Button>
      </div>

      <div className="flex items-center gap-2 bg-surface border border-border rounded p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 rounded text-sm font-medium transition-colors',
              activeTab === tab.id ? 'bg-yellow text-black' : 'text-muted hover:text-text'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface border border-border rounded pl-10 pr-4 py-2 text-sm w-64 focus:outline-none focus:border-yellow"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowFilters(f => !f)}>
            <Filter className="w-4 h-4 mr-2" />
            Filter
            {filterTypes.length > 0 && (
              <span className="ml-2 bg-yellow text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {filterTypes.length}
              </span>
            )}
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {showFilters && (
        <div className="bg-surface border border-border rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-muted uppercase tracking-wider">Filter by Type</span>
            {filterTypes.length > 0 && (
              <button
                onClick={() => setFilterTypes([])}
                className="text-xs text-yellow hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {JOB_TYPES.map(t => (
              <label key={t.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterTypes.includes(t.value)}
                  onChange={(e) => {
                    setFilterTypes(prev =>
                      e.target.checked ? [...prev, t.value] : prev.filter(v => v !== t.value)
                    );
                  }}
                  className="accent-yellow"
                />
                <span className="text-sm capitalize">{t.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <Panel>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded" />)}
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="space-y-3">
            {filteredJobs.map(job => (
              <div
                key={job.id}
                onClick={() => router.push(`/jobs/${job.id}`)}
                className="flex items-center gap-4 p-4 bg-surface-2 rounded hover:bg-surface-3 transition-colors cursor-pointer"
              >
                <div className="font-mono text-sm text-muted w-20">{job.job_number}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{job.title}</div>
                  <div className="text-xs text-muted truncate">{job.client?.company_name ?? '—'}</div>
                </div>
                <div className="text-xs text-muted uppercase tracking-wide w-24">{job.type ?? '—'}</div>
                <Badge status={job.status} />
                <div className="text-right w-28 font-mono">
                  {job.value ? formatCurrency(job.value) : '—'}
                </div>
                <div className="w-32">
                  <div className="w-full bg-surface-3 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-yellow" style={{ width: `${job.progress_percent}%` }} />
                  </div>
                  <div className="text-xs text-muted text-right mt-1">{job.progress_percent}%</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted">
            <p>No jobs found matching your criteria</p>
          </div>
        )}
      </Panel>

      {showNewJobModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-condensed font-bold">Create New Job</h2>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded bg-danger/10 border border-danger text-danger text-sm">{formError}</div>
              )}
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Client</label>
                <select
                  value={form.client_id}
                  onChange={(e) => setForm(f => ({ ...f, client_id: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                >
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Job Title *</label>
                <input
                  type="text"
                  placeholder="Enter job title..."
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                >
                  <option value="">Select type...</option>
                  <option value="drainage">Drainage</option>
                  <option value="foundations">Foundations</option>
                  <option value="excavation">Excavation</option>
                  <option value="kerbing">Kerbing</option>
                  <option value="sewers">Sewers</option>
                  <option value="reinstatement">Reinstatement</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Site Address</label>
                <textarea
                  placeholder="Enter site address..."
                  rows={2}
                  value={form.site_address}
                  onChange={(e) => setForm(f => ({ ...f, site_address: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Value (£)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.value}
                    onChange={(e) => setForm(f => ({ ...f, value: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Description</label>
                <textarea
                  placeholder="Enter description..."
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setShowNewJobModal(false); setForm(EMPTY_FORM); setFormError(null); }}>
                Cancel
              </Button>
              <Button onClick={handleCreateJob} loading={submitting} disabled={submitting}>
                Create Job
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

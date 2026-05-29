'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Filter, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

type Job = {
  id: string;
  job_number: string;
  title: string;
  client_name: string;
  site_address: string;
  status: string;
  type: string;
  value: number;
  progress_percent: number;
  start_date: string;
};

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'quoted', label: 'Quoted' },
  { id: 'complete', label: 'Complete' },
];

export default function JobsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    const loadJobs = async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
      setJobs([
        {
          id: '1',
          job_number: 'GW-0015',
          title: 'Newbury Site Preparation',
          client_name: 'Barrett Homes',
          site_address: 'Newbury Business Park, RG14 2LP',
          status: 'active',
          type: 'Foundations',
          value: 45000,
          progress_percent: 65,
          start_date: '2024-01-15',
        },
        {
          id: '2',
          job_number: 'GW-0016',
          title: 'Reading Retail Development',
          client_name: 'Weston Homes',
          site_address: 'Reading Town Centre, RG1 7LG',
          status: 'active',
          type: 'Excavation',
          value: 32000,
          progress_percent: 40,
          start_date: '2024-01-20',
        },
        {
          id: '3',
          job_number: 'GW-0014',
          title: 'Swindon Depot Upgrade',
          client_name: 'Local Council',
          site_address: 'Swindon Industrial Estate, SN1 4LZ',
          status: 'on-hold',
          type: 'Drainage',
          value: 18000,
          progress_percent: 80,
          start_date: '2023-12-01',
        },
        {
          id: '4',
          job_number: 'GW-0013',
          title: 'Oxford Housing Development',
          client_name: 'Bloor Homes',
          site_address: 'Oxford Business Park, OX4 2JZ',
          status: 'complete',
          type: 'Kerbing',
          value: 25000,
          progress_percent: 100,
          start_date: '2023-11-01',
        },
        {
          id: '5',
          job_number: 'GW-0017',
          title: 'Bristol Office Block',
          client_name: 'Commercial Developments Ltd',
          site_address: 'Bristol Harbour, BS1 6AH',
          status: 'quoted',
          type: 'Foundations',
          value: 85000,
          progress_percent: 0,
          start_date: '',
        },
      ]);
      setIsLoading(false);
    };
    loadJobs();
  }, []);

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;
  };

  const filteredJobs = jobs.filter(job => {
    const matchesTab = activeTab === 'all' || job.status === activeTab;
    const matchesSearch = searchQuery === '' || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.job_number.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Tab Bar */}
      <div className="flex items-center gap-2 bg-surface border border-border rounded p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 rounded text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-yellow text-black'
                : 'text-muted hover:text-text'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Actions Bar */}
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
          <Button variant="ghost" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
        <Button variant="ghost" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Jobs Table */}
      <Panel>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded" />
            ))}
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="space-y-3">
            {filteredJobs.map(job => (
              <div
                key={job.id}
                className="flex items-center gap-4 p-4 bg-surface-2 rounded hover:bg-surface-3 transition-colors cursor-pointer"
              >
                <div className="font-mono text-sm text-muted w-20">{job.job_number}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{job.title}</div>
                  <div className="text-xs text-muted truncate">{job.client_name}</div>
                </div>
                <div className="text-xs text-muted uppercase tracking-wide w-24">{job.type}</div>
                <Badge status={job.status} />
                <div className="text-right w-28 font-mono">{formatCurrency(job.value)}</div>
                <div className="w-32">
                  <div className="w-full bg-surface-3 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-yellow"
                      style={{ width: `${job.progress_percent}%` }}
                    />
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

      {/* New Job Modal */}
      {showNewJobModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-condensed font-bold">Create New Job</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Client</label>
                <select className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow">
                  <option value="">Select client...</option>
                  <option value="1">Barrett Homes</option>
                  <option value="2">Weston Homes</option>
                  <option value="3">Local Council</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Job Title</label>
                <input
                  type="text"
                  placeholder="Enter job title..."
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Type</label>
                <select className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow">
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
                  rows={3}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Value (£)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Start Date</label>
                  <input
                    type="date"
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Description</label>
                <textarea
                  placeholder="Enter description..."
                  rows={3}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowNewJobModal(false)}>Cancel</Button>
              <Button onClick={() => setShowNewJobModal(false)}>Create Job</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

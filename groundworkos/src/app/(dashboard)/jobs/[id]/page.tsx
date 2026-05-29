'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, MapPin, User, FileText, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type Job = {
  id: string;
  job_number: string;
  title: string;
  description: string;
  site_address: string;
  status: string;
  type: string;
  value: number;
  progress_percent: number;
  start_date: string;
  end_date: string;
  client: {
    id: string;
    company_name: string;
    contact_name: string;
    phone: string;
  };
  documents: Array<{
    id: string;
    name: string;
    type: string;
    expiry_date: string;
  }>;
  schedule_entries: Array<{
    id: string;
    title: string;
    start_datetime: string;
    end_datetime: string;
    crew_count: number;
  }>;
  history: Array<{
    status: string;
    timestamp: string;
    notes: string;
  }>;
};

const statusOptions = ['enquiry', 'quoted', 'active', 'on-hold', 'complete', 'cancelled'];

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [job, setJob] = useState<Job | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [showLogVisitModal, setShowLogVisitModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [progressValue, setProgressValue] = useState(0);
  const [visitNotes, setVisitNotes] = useState('');

  useEffect(() => {
    const loadJob = async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
      setJob({
        id: jobId,
        job_number: 'GW-0015',
        title: 'Newbury Site Preparation',
        description: 'Full site preparation including excavation, drainage installation, and groundworks for a new residential development. This includes foundation work for 12 new homes.',
        site_address: 'Newbury Business Park, RG14 2LP',
        status: 'active',
        type: 'Foundations',
        value: 45000,
        progress_percent: 65,
        start_date: '2024-01-15',
        end_date: '2024-03-30',
        client: {
          id: '1',
          company_name: 'Barrett Homes',
          contact_name: 'John Smith',
          phone: '01234 567890',
        },
        documents: [
          { id: '1', name: 'RAMS Document', type: 'rams', expiry_date: '2024-12-31' },
          { id: '2', name: 'Site Plan', type: 'other', expiry_date: '' },
        ],
        schedule_entries: [
          { id: '1', title: 'Excavation Phase', start_datetime: '2024-01-22T08:00:00', end_datetime: '2024-01-22T17:00:00', crew_count: 4 },
          { id: '2', title: 'Foundation Pour', start_datetime: '2024-01-25T08:00:00', end_datetime: '2024-01-25T12:00:00', crew_count: 3 },
        ],
        history: [
          { status: 'enquiry', timestamp: '2024-01-10T09:00:00', notes: 'Initial enquiry received' },
          { status: 'quoted', timestamp: '2024-01-12T14:00:00', notes: 'Quote sent to client' },
          { status: 'active', timestamp: '2024-01-15T08:00:00', notes: 'Work commenced' },
        ],
      });
      setProgressValue(65);
      setIsLoading(false);
    };
    loadJob();
  }, [jobId]);

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (datetimeString: string) => {
    const date = new Date(datetimeString);
    return {
      date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-32 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 rounded" />
            <Skeleton className="h-64 rounded" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 rounded" />
            <Skeleton className="h-64 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-condensed font-bold">{job!.title}</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="font-mono text-sm text-muted">{job!.job_number}</span>
              <Badge status={job!.status} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setShowUpdateStatusModal(true)}>
            Update Status
          </Button>
          <Button onClick={() => setShowLogVisitModal(true)}>
            Log Site Visit
          </Button>
        </div>
      </div>

      {/* Job Summary Card */}
      <Panel>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Value</div>
            <div className="text-2xl font-condensed font-bold">{formatCurrency(job!.value)}</div>
          </div>
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Progress</div>
            <div className="flex items-center gap-3">
              <div className="w-32">
                <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-yellow" style={{ width: `${job!.progress_percent}%` }} />
                </div>
              </div>
              <span className="text-2xl font-condensed font-bold">{job!.progress_percent}%</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Start Date</div>
            <div className="text-lg font-condensed">{formatDate(job!.start_date)}</div>
          </div>
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">End Date</div>
            <div className="text-lg font-condensed">{formatDate(job!.end_date)}</div>
          </div>
        </div>
      </Panel>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Tab */}
          <Panel title="Overview">
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-2">Description</h4>
                <p className="text-sm leading-relaxed">{job!.description}</p>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted mt-0.5" />
                <div>
                  <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Site Address</h4>
                  <p className="text-sm">{job!.site_address}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-muted mt-0.5" />
                <div>
                  <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Client</h4>
                  <p className="font-medium">{job!.client.company_name}</p>
                  <p className="text-sm text-muted">{job!.client.contact_name} | {job!.client.phone}</p>
                </div>
              </div>
            </div>
          </Panel>

          {/* Status History */}
          <Panel title="Status History">
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-4">
                {job!.history.map((item, index) => (
                  <div key={index} className="relative pl-12">
                    <div className={cn(
                      'absolute left-2 top-0 w-5 h-5 rounded-full border-2',
                      item.status === job!.status ? 'bg-yellow border-yellow' : 'bg-surface-2 border-border'
                    )} />
                    <div className="flex items-center justify-between">
                      <Badge status={item.status} />
                      <span className="text-xs text-muted font-mono">{formatDate(item.timestamp)}</span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-muted mt-1">{item.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Actions Panel */}
          <Panel title="Quick Actions">
            <div className="space-y-3">
              <Button variant="ghost" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Add Document
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                Add Schedule Entry
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <Clock className="w-4 h-4 mr-2" />
                View Timeline
              </Button>
            </div>
          </Panel>

          {/* Documents */}
          <Panel title="Documents">
            <div className="space-y-3">
              {job!.documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-surface-2 rounded">
                  <div>
                    <div className="font-medium text-sm">{doc.name}</div>
                    <div className="text-xs text-muted uppercase">{doc.type}</div>
                  </div>
                  {doc.expiry_date && (
                    <span className="text-xs text-muted font-mono">{formatDate(doc.expiry_date)}</span>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          {/* Schedule */}
          <Panel title="Schedule">
            <div className="space-y-3">
              {job!.schedule_entries.map(entry => {
                const dt = formatDateTime(entry.start_datetime);
                return (
                  <div key={entry.id} className="p-3 bg-surface-2 rounded">
                    <div className="font-medium text-sm">{entry.title}</div>
                    <div className="text-xs text-muted mt-1">
                      {dt.date} | {dt.time} | {entry.crew_count} crew
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>

      {/* Update Status Modal */}
      {showUpdateStatusModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded w-full max-w-md">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-condensed font-bold">Update Status</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Current Status</label>
                <Badge status={job!.status} />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                >
                  <option value="">Select status...</option>
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status.replace(/-/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Notes (optional)</label>
                <textarea
                  placeholder="Add notes..."
                  rows={3}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowUpdateStatusModal(false)}>Cancel</Button>
              <Button onClick={() => setShowUpdateStatusModal(false)}>Update Status</Button>
            </div>
          </div>
        </div>
      )}

      {/* Log Visit Modal */}
      {showLogVisitModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded w-full max-w-md">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-condensed font-bold">Log Site Visit</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Progress</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progressValue}
                    onChange={(e) => setProgressValue(Number(e.target.value))}
                    className="flex-1 h-2 bg-surface-2 rounded-full appearance-none cursor-pointer"
                  />
                  <span className="font-mono text-lg font-bold w-12 text-right">{progressValue}%</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Notes</label>
                <textarea
                  placeholder="Add site visit notes..."
                  rows={4}
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowLogVisitModal(false)}>Cancel</Button>
              <Button onClick={() => setShowLogVisitModal(false)}>Save Visit</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

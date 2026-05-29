'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, MapPin, User, FileText } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Job, Document, ScheduleEntry, StatusHistory, Client, DocumentType, DocumentStatus } from '@/types';

type JobDetail = Job & {
  client: Pick<Client, 'id' | 'company_name' | 'contact_name' | 'phone'> | null;
};

const STATUS_OPTIONS: Job['status'][] = ['enquiry', 'quoted', 'active', 'on-hold', 'complete', 'cancelled'];

const DOC_TYPES: DocumentType[] = ['insurance', 'rams', 'permit', 'cscs', 'other'];

interface DocForm {
  name: string;
  type: DocumentType;
  expiry_date: string;
}

interface SchedForm {
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  crew_count: string;
  plant_assigned: string;
  notes: string;
}

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [showLogVisitModal, setShowLogVisitModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [progressValue, setProgressValue] = useState(0);
  const [visitNotes, setVisitNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [docForm, setDocForm] = useState<DocForm>({ name: '', type: 'other', expiry_date: '' });
  const [schedForm, setSchedForm] = useState<SchedForm>({
    title: '', description: '', start_datetime: '', end_datetime: '',
    crew_count: '1', plant_assigned: '', notes: '',
  });
  const [submittingDoc, setSubmittingDoc] = useState(false);
  const [submittingSchedule, setSubmittingSchedule] = useState(false);
  const [docFormError, setDocFormError] = useState<string | null>(null);
  const [schedFormError, setSchedFormError] = useState<string | null>(null);

  const supabase = useRef(createClient());

  async function loadJob() {
    try {
      const [
        { data: jobData, error: jobError },
        { data: docsData },
        { data: schedData },
        { data: histData },
      ] = await Promise.all([
        supabase.current.from('jobs')
          .select('*, client:clients(id, company_name, contact_name, phone)')
          .eq('id', jobId).single(),
        supabase.current.from('documents')
          .select('*').eq('related_to', 'job').eq('related_id', jobId)
          .order('created_at', { ascending: false }),
        supabase.current.from('schedule_entries')
          .select('*').eq('job_id', jobId)
          .order('start_datetime'),
        supabase.current.from('status_history')
          .select('*').eq('entity_type', 'job').eq('entity_id', jobId)
          .order('created_at'),
      ]);
      if (jobError) throw jobError;
      if (!jobData) { setError('Job not found.'); return; }
      setJob(jobData as JobDetail);
      setProgressValue(jobData.progress_percent ?? 0);
      setDocuments((docsData ?? []) as Document[]);
      setScheduleEntries(schedData ?? []);
      setHistory(histData ?? []);
    } catch (err) {
      console.error('[JobDetail]', err);
      setError('Failed to load job. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadJob(); }, [jobId]);

  async function handleUpdateStatus() {
    if (!newStatus) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.current.from('jobs')
        .update({ status: newStatus }).eq('id', jobId);
      if (error) throw error;
      await supabase.current.from('status_history').insert({
        company_id: job!.company_id,
        entity_type: 'job',
        entity_id: jobId,
        old_status: job!.status,
        new_status: newStatus,
        notes: statusNotes || null,
      });
      setShowUpdateStatusModal(false);
      setNewStatus('');
      setStatusNotes('');
      await loadJob();
    } catch (err) {
      console.error('[JobDetail] update status error', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogVisit() {
    setSubmitting(true);
    try {
      const { error } = await supabase.current.from('jobs')
        .update({ progress_percent: progressValue, notes: visitNotes || job?.notes || null })
        .eq('id', jobId);
      if (error) throw error;
      setShowLogVisitModal(false);
      setVisitNotes('');
      await loadJob();
    } catch (err) {
      console.error('[JobDetail] log visit error', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddDocument() {
    if (!docForm.name.trim()) { setDocFormError('Document name is required.'); return; }
    setSubmittingDoc(true);
    setDocFormError(null);
    try {
      let status: DocumentStatus = 'active';
      if (docForm.expiry_date) {
        const expiry = new Date(docForm.expiry_date);
        const today = new Date();
        const thirtyDays = new Date(today);
        thirtyDays.setDate(thirtyDays.getDate() + 30);
        if (expiry < today) status = 'expired';
        else if (expiry < thirtyDays) status = 'expiring_soon';
      }
      const { error } = await supabase.current.from('documents').insert({
        company_id: job!.company_id,
        name: docForm.name.trim(),
        type: docForm.type,
        related_to: 'job',
        related_id: jobId,
        expiry_date: docForm.expiry_date || null,
        status,
        file_path: null,
      });
      if (error) throw error;
      setShowAddDocModal(false);
      setDocForm({ name: '', type: 'other', expiry_date: '' });
      await loadJob();
    } catch (err) {
      setDocFormError(err instanceof Error ? err.message : 'Failed to add document. Please try again.');
    } finally {
      setSubmittingDoc(false);
    }
  }

  async function handleAddScheduleEntry() {
    if (!schedForm.title.trim()) { setSchedFormError('Title is required.'); return; }
    if (!schedForm.start_datetime) { setSchedFormError('Start date/time is required.'); return; }
    if (!schedForm.end_datetime) { setSchedFormError('End date/time is required.'); return; }
    setSubmittingSchedule(true);
    setSchedFormError(null);
    try {
      const { error } = await supabase.current.from('schedule_entries').insert({
        company_id: job!.company_id,
        job_id: jobId,
        title: schedForm.title.trim(),
        description: schedForm.description || null,
        start_datetime: schedForm.start_datetime,
        end_datetime: schedForm.end_datetime,
        crew_count: parseInt(schedForm.crew_count, 10) || 1,
        plant_assigned: schedForm.plant_assigned || null,
        notes: schedForm.notes || null,
      });
      if (error) throw error;
      setShowAddScheduleModal(false);
      setSchedForm({ title: '', description: '', start_datetime: '', end_datetime: '', crew_count: '1', plant_assigned: '', notes: '' });
      await loadJob();
    } catch (err) {
      setSchedFormError(err instanceof Error ? err.message : 'Failed to add schedule entry. Please try again.');
    } finally {
      setSubmittingSchedule(false);
    }
  }

  function formatTime(datetime: string): string {
    const parts = datetime.split('T');
    return parts[1]?.substring(0, 5) ?? '';
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
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

  if (error || !job) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-danger mb-2">{error ?? 'Job not found'}</p>
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>Go back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <div>
            <h1 className="text-2xl font-condensed font-bold">{job.title}</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="font-mono text-sm text-muted">{job.job_number}</span>
              <Badge status={job.status} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setShowUpdateStatusModal(true)}>Update Status</Button>
          <Button onClick={() => setShowLogVisitModal(true)}>Log Site Visit</Button>
        </div>
      </div>

      <Panel>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Value</div>
            <div className="text-2xl font-condensed font-bold">{job.value ? formatCurrency(job.value) : '—'}</div>
          </div>
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Progress</div>
            <div className="flex items-center gap-3">
              <div className="w-32">
                <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-yellow" style={{ width: `${job.progress_percent}%` }} />
                </div>
              </div>
              <span className="text-2xl font-condensed font-bold">{job.progress_percent}%</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Start Date</div>
            <div className="text-lg font-condensed">{job.start_date ? formatDate(job.start_date) : '—'}</div>
          </div>
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">End Date</div>
            <div className="text-lg font-condensed">{job.end_date ? formatDate(job.end_date) : '—'}</div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Panel title="Overview">
            <div className="space-y-6">
              {job.description && (
                <div>
                  <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-2">Description</h4>
                  <p className="text-sm leading-relaxed">{job.description}</p>
                </div>
              )}
              {job.site_address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-muted mt-0.5" />
                  <div>
                    <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Site Address</h4>
                    <p className="text-sm">{job.site_address}</p>
                  </div>
                </div>
              )}
              {job.client && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-muted mt-0.5" />
                  <div>
                    <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Client</h4>
                    <p className="font-medium">{job.client.company_name}</p>
                    {(job.client.contact_name || job.client.phone) && (
                      <p className="text-sm text-muted">
                        {[job.client.contact_name, job.client.phone].filter(Boolean).join(' | ')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Status History">
            {history.length === 0 ? (
              <p className="text-sm text-muted">No status changes recorded.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-4">
                  {history.map((item, index) => (
                    <div key={item.id} className="relative pl-12">
                      <div className={cn(
                        'absolute left-2 top-0 w-5 h-5 rounded-full border-2',
                        index === history.length - 1 ? 'bg-yellow border-yellow' : 'bg-surface-2 border-border'
                      )} />
                      <div className="flex items-center justify-between">
                        <Badge status={item.new_status} />
                        <span className="text-xs text-muted font-mono">{formatDate(item.created_at)}</span>
                      </div>
                      {item.notes && <p className="text-sm text-muted mt-1">{item.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Quick Actions">
            <div className="space-y-3">
              <Button variant="ghost" className="w-full justify-start" onClick={() => setShowAddDocModal(true)}>
                <FileText className="w-4 h-4 mr-2" />Add Document
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setShowAddScheduleModal(true)}>
                <Calendar className="w-4 h-4 mr-2" />Add Schedule Entry
              </Button>
            </div>
          </Panel>

          <Panel title={`Documents (${documents.length})`}>
            {documents.length === 0 ? (
              <p className="text-sm text-muted">No documents attached.</p>
            ) : (
              <div className="space-y-3">
                {documents.map(doc => (
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
            )}
          </Panel>

          <Panel title={`Schedule (${scheduleEntries.length})`}>
            {scheduleEntries.length === 0 ? (
              <p className="text-sm text-muted">No schedule entries.</p>
            ) : (
              <div className="space-y-3">
                {scheduleEntries.slice(0, 5).map(entry => (
                  <div key={entry.id} className="p-3 bg-surface-2 rounded">
                    <div className="font-medium text-sm">{entry.title}</div>
                    <div className="text-xs text-muted mt-1">
                      {formatDate(entry.start_datetime.split('T')[0])} | {formatTime(entry.start_datetime)} | {entry.crew_count} crew
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                <Badge status={job.status} />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                >
                  <option value="">Select status...</option>
                  {STATUS_OPTIONS.filter(s => s !== job.status).map(s => (
                    <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Notes (optional)</label>
                <textarea
                  placeholder="Add notes..."
                  rows={3}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowUpdateStatusModal(false)}>Cancel</Button>
              <Button onClick={handleUpdateStatus} loading={submitting} disabled={submitting || !newStatus}>
                Update Status
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Log Site Visit Modal */}
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
              <Button onClick={handleLogVisit} loading={submitting} disabled={submitting}>Save Visit</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {showAddDocModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded w-full max-w-md">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-condensed font-bold">Add Document</h2>
            </div>
            <div className="p-6 space-y-4">
              {docFormError && (
                <div className="p-3 rounded bg-danger/10 border border-danger/30 text-danger text-sm">{docFormError}</div>
              )}
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Document Name *</label>
                <input
                  type="text"
                  placeholder="e.g. RAMS — Drainage Works"
                  value={docForm.name}
                  onChange={(e) => setDocForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Type</label>
                <select
                  value={docForm.type}
                  onChange={(e) => setDocForm(f => ({ ...f, type: e.target.value as DocumentType }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                >
                  {DOC_TYPES.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Expiry Date (optional)</label>
                <input
                  type="date"
                  value={docForm.expiry_date}
                  onChange={(e) => setDocForm(f => ({ ...f, expiry_date: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setShowAddDocModal(false); setDocFormError(null); }}>Cancel</Button>
              <Button onClick={handleAddDocument} loading={submittingDoc} disabled={submittingDoc}>Add Document</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Schedule Entry Modal */}
      {showAddScheduleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded w-full max-w-md max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-condensed font-bold">Add Schedule Entry</h2>
            </div>
            <div className="p-6 space-y-4">
              {schedFormError && (
                <div className="p-3 rounded bg-danger/10 border border-danger/30 text-danger text-sm">{schedFormError}</div>
              )}
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Site excavation day 1"
                  value={schedForm.title}
                  onChange={(e) => setSchedForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Start *</label>
                  <input
                    type="datetime-local"
                    value={schedForm.start_datetime}
                    onChange={(e) => setSchedForm(f => ({ ...f, start_datetime: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">End *</label>
                  <input
                    type="datetime-local"
                    value={schedForm.end_datetime}
                    onChange={(e) => setSchedForm(f => ({ ...f, end_datetime: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Crew Count</label>
                <input
                  type="number"
                  min="1"
                  value={schedForm.crew_count}
                  onChange={(e) => setSchedForm(f => ({ ...f, crew_count: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Plant Assigned (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 8-tonne digger"
                  value={schedForm.plant_assigned}
                  onChange={(e) => setSchedForm(f => ({ ...f, plant_assigned: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Notes (optional)</label>
                <textarea
                  rows={2}
                  value={schedForm.notes}
                  onChange={(e) => setSchedForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setShowAddScheduleModal(false); setSchedFormError(null); }}>Cancel</Button>
              <Button onClick={handleAddScheduleEntry} loading={submittingSchedule} disabled={submittingSchedule}>Save Entry</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Mail, Phone, FileText, Calendar, RefreshCw } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Subcontractor, Document, Job } from '@/types';

interface EditForm {
  company_name: string;
  contact_name: string;
  trade: string;
  utr_number: string;
  email: string;
  phone: string;
  notes: string;
}

export default function SubcontractorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const subcontractorId = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [subcontractor, setSubcontractor] = useState<Subcontractor | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    company_name: '', contact_name: '', trade: '', utr_number: '',
    email: '', phone: '', notes: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const supabase = useRef(createClient());

  useEffect(() => {
    async function load() {
      try {
        const [
          { data: subData, error: subError },
          { data: docsData },
          { data: jobsData },
        ] = await Promise.all([
          supabase.current.from('subcontractors').select('*').eq('id', subcontractorId).single(),
          supabase.current.from('documents').select('*')
            .eq('related_to', 'subcontractor').eq('related_id', subcontractorId)
            .order('expiry_date', { ascending: true, nullsFirst: false }),
          supabase.current.from('jobs').select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false }),
        ]);
        if (subError) throw subError;
        if (!subData) { setError('Subcontractor not found.'); return; }
        setSubcontractor(subData as Subcontractor);
        setEditForm({
          company_name: subData.company_name,
          contact_name: subData.contact_name ?? '',
          trade: subData.trade ?? '',
          utr_number: subData.utr_number ?? '',
          email: subData.email ?? '',
          phone: subData.phone ?? '',
          notes: subData.notes ?? '',
        });
        setDocuments((docsData ?? []) as Document[]);
        setJobs((jobsData ?? []) as Job[]);
      } catch (err) {
        console.error('[SubcontractorDetail]', err);
        setError('Failed to load subcontractor. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [subcontractorId]);

  async function handleEditSubcontractor() {
    if (!editForm.company_name.trim()) { setEditError('Company name is required.'); return; }
    setEditSubmitting(true);
    setEditError(null);
    try {
      const { error } = await supabase.current.from('subcontractors').update({
        company_name: editForm.company_name.trim(),
        contact_name: editForm.contact_name || null,
        trade: editForm.trade || null,
        utr_number: editForm.utr_number || null,
        email: editForm.email || null,
        phone: editForm.phone || null,
        notes: editForm.notes || null,
      }).eq('id', subcontractorId);
      if (error) throw error;
      const { data: updated } = await supabase.current.from('subcontractors').select('*').eq('id', subcontractorId).single();
      if (updated) setSubcontractor(updated as Subcontractor);
      setShowEditModal(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update subcontractor. Please try again.');
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleReVerifyCIS() {
    if (!subcontractor) return;
    setVerifying(true);
    try {
      const newStatus = subcontractor.utr_number ? 'net' : 'unverified';
      const { error } = await supabase.current.from('subcontractors').update({
        cis_status: newStatus,
        cis_verified_at: new Date().toISOString(),
      }).eq('id', subcontractorId);
      if (error) throw error;
      const { data: updated } = await supabase.current.from('subcontractors').select('*').eq('id', subcontractorId).single();
      if (updated) setSubcontractor(updated as Subcontractor);
    } catch (err) {
      console.error('[SubcontractorDetail] re-verify error', err);
    } finally {
      setVerifying(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-48 rounded" />
        <Skeleton className="h-64 rounded" />
      </div>
    );
  }

  if (error || !subcontractor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-danger mb-2">{error ?? 'Subcontractor not found'}</p>
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>Go back</Button>
        </div>
      </div>
    );
  }

  const cisLabel = subcontractor.cis_status === 'net' ? 'CIS Net'
    : subcontractor.cis_status === 'gross' ? 'Gross Status'
    : subcontractor.cis_status === 'unverified' ? 'Unverified'
    : 'Unmatched';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <div>
            <h1 className="text-2xl font-condensed font-bold">{subcontractor.company_name}</h1>
            {subcontractor.trade && <p className="text-muted text-sm mt-1">{subcontractor.trade}</p>}
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={handleReVerifyCIS} loading={verifying} disabled={verifying}>
            <RefreshCw className="w-4 h-4 mr-2" />Re-verify CIS
          </Button>
          <Button onClick={() => setShowEditModal(true)}>Edit Subcontractor</Button>
        </div>
      </div>

      <Panel>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center">
              <span className="text-lg font-bold">
                {subcontractor.contact_name ? subcontractor.contact_name.charAt(0) : '?'}
              </span>
            </div>
            <div>
              <div className="text-xs font-mono text-muted uppercase tracking-wider">Contact</div>
              <div className="font-medium">{subcontractor.contact_name ?? '—'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center">
              <Mail className="w-5 h-5 text-muted" />
            </div>
            <div>
              <div className="text-xs font-mono text-muted uppercase tracking-wider">Email</div>
              <div className="font-medium">{subcontractor.email ?? '—'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center">
              <Phone className="w-5 h-5 text-muted" />
            </div>
            <div>
              <div className="text-xs font-mono text-muted uppercase tracking-wider">Phone</div>
              <div className="font-medium">{subcontractor.phone ?? '—'}</div>
            </div>
          </div>
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider">UTR Number</div>
            <div className="font-mono font-medium">{subcontractor.utr_number ?? '—'}</div>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow/20 flex items-center justify-center">
              <span className="text-sm font-bold text-yellow">CIS</span>
            </div>
            <div>
              <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">
                Construction Industry Scheme
              </div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-condensed font-bold">{cisLabel}</h3>
                <Badge status={subcontractor.cis_status} />
              </div>
              {subcontractor.cis_verified_at && (
                <p className="text-sm text-muted mt-1">
                  Last verified: {formatDate(subcontractor.cis_verified_at)}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Deduction Rate</p>
            <p className="text-3xl font-condensed font-bold">
              {subcontractor.cis_status === 'gross' ? '30%' : '20%'}
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title={`Documents (${documents.length})`}>
          {documents.length === 0 ? (
            <p className="text-sm text-muted">No documents on file.</p>
          ) : (
            <div className="space-y-3">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-surface-2 rounded">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted" />
                    <div>
                      <div className="font-medium text-sm">{doc.name}</div>
                      <div className="text-xs text-muted uppercase">{doc.type}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {doc.expiry_date && (
                      <div className="text-xs font-mono text-muted">Exp: {formatDate(doc.expiry_date)}</div>
                    )}
                    <Badge status={doc.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title={`Active Jobs (${jobs.length})`}>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted">No active jobs.</p>
          ) : (
            <div className="space-y-3">
              {jobs.map(job => (
                <div key={job.id} className="flex items-center justify-between p-3 bg-surface-2 rounded">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted" />
                    <div>
                      <div className="font-mono text-sm text-muted">{job.job_number}</div>
                      <div className="font-medium text-sm">{job.title}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/jobs/${job.id}`)}>View</Button>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-condensed font-bold">Edit Subcontractor</h2>
            </div>
            <div className="p-6 space-y-4">
              {editError && (
                <div className="p-3 rounded bg-danger/10 border border-danger/30 text-danger text-sm">{editError}</div>
              )}
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Company Name *</label>
                <input
                  type="text"
                  value={editForm.company_name}
                  onChange={(e) => setEditForm(f => ({ ...f, company_name: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Contact Name</label>
                  <input
                    type="text"
                    value={editForm.contact_name}
                    onChange={(e) => setEditForm(f => ({ ...f, contact_name: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Trade</label>
                  <input
                    type="text"
                    value={editForm.trade}
                    onChange={(e) => setEditForm(f => ({ ...f, trade: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">UTR Number</label>
                  <input
                    type="text"
                    value={editForm.utr_number}
                    onChange={(e) => setEditForm(f => ({ ...f, utr_number: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Notes</label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setShowEditModal(false); setEditError(null); }}>Cancel</Button>
              <Button onClick={handleEditSubcontractor} loading={editSubmitting} disabled={editSubmitting}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

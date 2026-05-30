'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, FileText, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Document, DocumentType, DocumentStatus, Job, Subcontractor } from '@/types';

type DocumentRow = Document & { related_name: string };

const FILTER_TABS = ['all', 'insurance', 'rams', 'permit', 'cscs', 'other', 'expiring', 'expired'] as const;
type FilterTab = typeof FILTER_TABS[number];

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'insurance', label: 'Insurance' },
  { value: 'rams', label: 'RAMS' },
  { value: 'permit', label: 'Permit' },
  { value: 'cscs', label: 'CSCS' },
  { value: 'other', label: 'Other' },
];

interface UploadForm {
  name: string;
  type: DocumentType;
  related_to: '' | 'job' | 'subcontractor' | 'company';
  related_id: string;
  expiry_date: string;
}

function deriveDocumentStatus(expiryDate: string | null): DocumentStatus {
  if (!expiryDate) return 'active';
  const expiry = new Date(expiryDate);
  const now = new Date();
  if (expiry < now) return 'expired';
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (expiry < thirtyDays) return 'expiring_soon';
  return 'active';
}

export default function DocumentsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [error, setError] = useState<string | null>(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState<UploadForm>({
    name: '', type: 'other', related_to: '', related_id: '', expiry_date: '',
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dropdownJobs, setDropdownJobs] = useState<Pick<Job, 'id' | 'job_number' | 'title'>[]>([]);
  const [dropdownSubs, setDropdownSubs] = useState<Pick<Subcontractor, 'id' | 'company_name'>[]>([]);

  const supabase = useRef(createClient());

  async function loadDocuments() {
    try {
      const { data: docs, error: docsError } = await supabase.current
        .from('documents')
        .select('*')
        .order('expiry_date', { ascending: true, nullsFirst: false });
      if (docsError) throw docsError;

      const rows = docs ?? [];
      if (rows.length === 0) { setDocuments([]); return; }

      const jobIds = [...new Set(rows.filter(d => d.related_to === 'job' && d.related_id).map(d => d.related_id as string))];
      const subIds = [...new Set(rows.filter(d => d.related_to === 'subcontractor' && d.related_id).map(d => d.related_id as string))];

      const [{ data: jobsData }, { data: subsData }] = await Promise.all([
        jobIds.length > 0
          ? supabase.current.from('jobs').select('id, job_number, title').in('id', jobIds)
          : Promise.resolve({ data: [] }),
        subIds.length > 0
          ? supabase.current.from('subcontractors').select('id, company_name').in('id', subIds)
          : Promise.resolve({ data: [] }),
      ]);

      const jobMap = Object.fromEntries((jobsData ?? []).map(j => [j.id, j.job_number]));
      const subMap = Object.fromEntries((subsData ?? []).map(s => [s.id, s.company_name]));

      const enriched: DocumentRow[] = rows.map(doc => {
        let related_name = 'Company';
        if (doc.related_to === 'job' && doc.related_id) related_name = jobMap[doc.related_id] ?? 'Job';
        if (doc.related_to === 'subcontractor' && doc.related_id) related_name = subMap[doc.related_id] ?? 'Subcontractor';
        return { ...doc, related_name };
      });

      setDocuments(enriched);
    } catch (err) {
      console.error('[Documents]', err);
      setError('Failed to load documents. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDropdownData() {
    const [{ data: jobs }, { data: subs }] = await Promise.all([
      supabase.current.from('jobs').select('id, job_number, title').order('created_at', { ascending: false }).limit(100),
      supabase.current.from('subcontractors').select('id, company_name').order('company_name').limit(100),
    ]);
    setDropdownJobs((jobs ?? []) as Pick<Job, 'id' | 'job_number' | 'title'>[]);
    setDropdownSubs((subs ?? []) as Pick<Subcontractor, 'id' | 'company_name'>[]);
  }

  useEffect(() => {
    loadDocuments();
    loadDropdownData();
  }, []);

  async function handleUpload() {
    if (!uploadForm.name.trim()) { setUploadError('Document name is required.'); return; }
    setUploadSubmitting(true);
    setUploadError(null);
    try {
      const { data: uc } = await supabase.current
        .from('user_companies')
        .select('company_id')
        .single();
      if (!uc?.company_id) throw new Error('No company associated with this account.');

      let filePath: string | null = null;
      if (uploadFile) {
        const ext = uploadFile.name.split('.').pop() ?? 'bin';
        const path = `${uc.company_id}/${Date.now()}_${uploadForm.name.trim().replace(/\s+/g, '-')}.${ext}`;
        const { data: storageData, error: storageError } = await supabase.current.storage
          .from('groundworkos-documents')
          .upload(path, uploadFile);
        if (storageError) {
          console.warn('[Documents] Storage upload failed, continuing without file:', storageError.message);
        } else {
          filePath = storageData?.path ?? null;
        }
      }

      const status = deriveDocumentStatus(uploadForm.expiry_date || null);

      const { error } = await supabase.current.from('documents').insert({
        company_id: uc.company_id,
        name: uploadForm.name.trim(),
        type: uploadForm.type,
        related_to: uploadForm.related_to || null,
        related_id: (uploadForm.related_to && uploadForm.related_id) ? uploadForm.related_id : null,
        expiry_date: uploadForm.expiry_date || null,
        file_path: filePath,
        status,
      });
      if (error) throw error;

      setShowUploadModal(false);
      setUploadForm({ name: '', type: 'other', related_to: '', related_id: '', expiry_date: '' });
      setUploadFile(null);
      await loadDocuments();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload document. Please try again.');
    } finally {
      setUploadSubmitting(false);
    }
  }

  const filteredDocuments = documents.filter(doc => {
    if (filter === 'all') return true;
    if (filter === 'expiring') return doc.status === 'expiring_soon';
    if (filter === 'expired') return doc.status === 'expired';
    return doc.type === filter;
  });

  const expiredCount = documents.filter(d => d.status === 'expired').length;
  const expiringCount = documents.filter(d => d.status === 'expiring_soon').length;
  const activeCount = documents.filter(d => d.status === 'active').length;

  const complianceStatus: 'green' | 'amber' | 'red' =
    expiredCount > 0 ? 'red' : expiringCount > 0 ? 'amber' : 'green';

  function getStatusIcon(status: string) {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'expiring_soon': return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'expired': return <AlertTriangle className="w-4 h-4 text-danger" />;
      default: return null;
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-danger mb-2">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => { setError(null); setIsLoading(true); loadDocuments(); }}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-condensed font-bold">Documents</h1>
          <p className="text-muted text-sm mt-1">Manage compliance documents and certificates</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <Panel>
        {isLoading ? (
          <Skeleton className="h-20 rounded" />
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center',
                complianceStatus === 'green' && 'bg-success/20',
                complianceStatus === 'amber' && 'bg-warning/20',
                complianceStatus === 'red' && 'bg-danger/20'
              )}>
                <Shield className={cn(
                  'w-8 h-8',
                  complianceStatus === 'green' && 'text-success',
                  complianceStatus === 'amber' && 'text-warning',
                  complianceStatus === 'red' && 'text-danger'
                )} />
              </div>
              <div>
                <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Compliance Status</div>
                <h3 className={cn(
                  'text-2xl font-condensed font-bold',
                  complianceStatus === 'green' && 'text-success',
                  complianceStatus === 'amber' && 'text-warning',
                  complianceStatus === 'red' && 'text-danger'
                )}>
                  {complianceStatus === 'green' && 'All Clear'}
                  {complianceStatus === 'amber' && 'Needs Attention'}
                  {complianceStatus === 'red' && 'Non-Compliant'}
                </h3>
              </div>
            </div>
            <div className="flex gap-8 text-center">
              <div>
                <div className="text-3xl font-condensed font-bold text-success">{activeCount}</div>
                <div className="text-xs text-muted mt-1">Active</div>
              </div>
              <div>
                <div className="text-3xl font-condensed font-bold text-warning">{expiringCount}</div>
                <div className="text-xs text-muted mt-1">Expiring Soon</div>
              </div>
              <div>
                <div className="text-3xl font-condensed font-bold text-danger">{expiredCount}</div>
                <div className="text-xs text-muted mt-1">Expired</div>
              </div>
            </div>
          </div>
        )}
      </Panel>

      <div className="flex items-center gap-2 bg-surface border border-border rounded p-1 overflow-x-auto">
        {FILTER_TABS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 rounded text-sm font-medium transition-colors capitalize whitespace-nowrap',
              filter === f ? 'bg-yellow text-black' : 'text-muted hover:text-text'
            )}
          >
            {f === 'expiring' ? 'Expiring Soon' : f === 'expired' ? 'Expired' : f}
          </button>
        ))}
      </div>

      <Panel>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded" />)}
          </div>
        ) : filteredDocuments.length > 0 ? (
          <div className="space-y-3">
            {filteredDocuments.map(doc => (
              <div
                key={doc.id}
                className="flex items-center gap-4 p-4 bg-surface-2 rounded hover:bg-surface-3 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{doc.name}</div>
                  <div className="text-xs text-muted">
                    {doc.type.toUpperCase()} • {doc.related_name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono">
                    {doc.expiry_date ? `Expires: ${formatDate(doc.expiry_date)}` : 'No expiry'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(doc.status)}
                  <Badge status={doc.status} />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!doc.file_path}
                  onClick={async () => {
                    if (!doc.file_path) return;
                    const { data } = await supabase.current.storage
                      .from('groundworkos-documents')
                      .createSignedUrl(doc.file_path, 120);
                    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                  }}
                >
                  View
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No documents found</p>
          </div>
        )}
      </Panel>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-condensed font-bold">Upload Document</h2>
            </div>
            <div className="p-6 space-y-4">
              {uploadError && (
                <div className="p-3 rounded bg-danger/10 border border-danger/30 text-danger text-sm">{uploadError}</div>
              )}
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Document Name *</label>
                <input
                  type="text"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  placeholder="e.g. Public Liability Insurance 2025"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Document Type</label>
                  <select
                    value={uploadForm.type}
                    onChange={(e) => setUploadForm(f => ({ ...f, type: e.target.value as DocumentType }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  >
                    {DOC_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Expiry Date</label>
                  <input
                    type="date"
                    value={uploadForm.expiry_date}
                    onChange={(e) => setUploadForm(f => ({ ...f, expiry_date: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Related To</label>
                <select
                  value={uploadForm.related_to}
                  onChange={(e) => setUploadForm(f => ({ ...f, related_to: e.target.value as UploadForm['related_to'], related_id: '' }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                >
                  <option value="">Company (General)</option>
                  <option value="job">Job</option>
                  <option value="subcontractor">Subcontractor</option>
                  <option value="company">Company (Explicit)</option>
                </select>
              </div>
              {uploadForm.related_to === 'job' && (
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Select Job</label>
                  <select
                    value={uploadForm.related_id}
                    onChange={(e) => setUploadForm(f => ({ ...f, related_id: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  >
                    <option value="">— Select a job —</option>
                    {dropdownJobs.map(j => (
                      <option key={j.id} value={j.id}>{j.job_number} — {j.title}</option>
                    ))}
                  </select>
                </div>
              )}
              {uploadForm.related_to === 'subcontractor' && (
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Select Subcontractor</label>
                  <select
                    value={uploadForm.related_id}
                    onChange={(e) => setUploadForm(f => ({ ...f, related_id: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  >
                    <option value="">— Select a subcontractor —</option>
                    {dropdownSubs.map(s => (
                      <option key={s.id} value={s.id}>{s.company_name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">File (Optional)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.docx"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow file:mr-3 file:bg-yellow file:text-black file:border-0 file:rounded file:px-2 file:py-1 file:text-xs file:font-medium file:cursor-pointer"
                />
                <p className="text-xs text-muted mt-1">PDF, JPG, PNG or DOCX. Record will be saved even if upload fails.</p>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setShowUploadModal(false); setUploadError(null); setUploadFile(null); }}>Cancel</Button>
              <Button onClick={handleUpload} loading={uploadSubmitting} disabled={uploadSubmitting}>Upload Document</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

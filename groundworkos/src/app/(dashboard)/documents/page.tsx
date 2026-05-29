'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, FileText, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Document } from '@/types';

type DocumentRow = Document & { related_name: string };

const FILTER_TABS = ['all', 'insurance', 'rams', 'permit', 'cscs', 'other', 'expiring', 'expired'] as const;
type FilterTab = typeof FILTER_TABS[number];

export default function DocumentsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => { loadDocuments(); }, []);

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
        <Button>
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
                <Button variant="ghost" size="sm">View</Button>
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
    </div>
  );
}

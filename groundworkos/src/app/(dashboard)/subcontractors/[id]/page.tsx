'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Mail, Phone, FileText, Calendar, RefreshCw } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Subcontractor, Document, Job } from '@/types';

export default function SubcontractorDetailPage() {
  const params = useParams();
  const subcontractorId = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [subcontractor, setSubcontractor] = useState<Subcontractor | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
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
          <Button variant="ghost">
            <RefreshCw className="w-4 h-4 mr-2" />Re-verify CIS
          </Button>
          <Button>Edit Subcontractor</Button>
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
                  <Button variant="ghost" size="sm">View</Button>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

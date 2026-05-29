'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Subcontractor } from '@/types';

type SubcontractorRow = Subcontractor & {
  has_expiring_documents: boolean;
  document_count: number;
};

export default function SubcontractorsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [subcontractors, setSubcontractors] = useState<SubcontractorRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const supabase = useRef(createClient());

  async function loadSubcontractors() {
    try {
      const [{ data: subs, error: subsError }, { data: docs }] = await Promise.all([
        supabase.current.from('subcontractors').select('*').order('company_name'),
        supabase.current
          .from('documents')
          .select('related_id, status')
          .eq('related_to', 'subcontractor'),
      ]);
      if (subsError) throw subsError;

      const docsData = docs ?? [];
      const rows: SubcontractorRow[] = (subs ?? []).map(s => {
        const subDocs = docsData.filter(d => d.related_id === s.id);
        return {
          ...s,
          document_count: subDocs.length,
          has_expiring_documents: subDocs.some(d => d.status === 'expired' || d.status === 'expiring_soon'),
        };
      });
      setSubcontractors(rows);
    } catch (err) {
      console.error('[Subcontractors]', err);
      setError('Failed to load subcontractors. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadSubcontractors(); }, []);

  const showWarning = subcontractors.some(s => s.cis_status === 'unverified' || s.has_expiring_documents);

  function getCISIcon(status: string) {
    switch (status) {
      case 'net':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'unverified':
      case 'unmatched':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'gross':
        return <XCircle className="w-4 h-4 text-danger" />;
      default:
        return null;
    }
  }

  function getCISLabel(status: string) {
    switch (status) {
      case 'net': return 'CIS Net';
      case 'gross': return 'Gross Status';
      case 'unverified': return 'Unverified';
      case 'unmatched': return 'Unmatched';
      default: return status;
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-danger mb-2">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => { setError(null); setIsLoading(true); loadSubcontractors(); }}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-condensed font-bold">Subcontractors</h1>
          <p className="text-muted text-sm mt-1">Manage your subbies and CIS compliance</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Subcontractor
        </Button>
      </div>

      {!isLoading && showWarning && (
        <div className="bg-warning/10 border border-warning/30 rounded p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
          <div>
            <div className="font-semibold">Action Required</div>
            <p className="text-sm text-muted">
              One or more subcontractors need attention — unverified CIS status or expiring documents.
            </p>
          </div>
        </div>
      )}

      <Panel>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded" />)}
          </div>
        ) : subcontractors.length > 0 ? (
          <div className="space-y-3">
            {subcontractors.map(sub => (
              <div
                key={sub.id}
                className="flex items-center gap-4 p-4 bg-surface-2 rounded hover:bg-surface-3 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{sub.company_name}</h3>
                    {sub.has_expiring_documents && (
                      <AlertTriangle className="w-4 h-4 text-warning" />
                    )}
                  </div>
                  <div className="text-sm text-muted">{sub.contact_name ?? '—'}</div>
                </div>
                <div className="text-sm">
                  <div className="text-xs text-muted uppercase tracking-wide">Trade</div>
                  <div>{sub.trade ?? '—'}</div>
                </div>
                <div className="text-sm min-w-[120px]">
                  <div className="text-xs text-muted uppercase tracking-wide">UTR Number</div>
                  <div className="font-mono">{sub.utr_number ?? '—'}</div>
                </div>
                <div className="text-sm min-w-[140px]">
                  <div className="text-xs text-muted uppercase tracking-wide">CIS Status</div>
                  <div className="flex items-center gap-2">
                    {getCISIcon(sub.cis_status)}
                    <span>{getCISLabel(sub.cis_status)}</span>
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-xs text-muted uppercase tracking-wide">Documents</div>
                  <div>{sub.document_count} files</div>
                </div>
                <div className="flex gap-2">
                  {(sub.cis_status === 'unverified' || sub.cis_status === 'unmatched') && (
                    <Button variant="ghost" size="sm">Verify CIS</Button>
                  )}
                  <Button variant="ghost" size="sm">View</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted">
            <p>No subcontractors found</p>
          </div>
        )}
      </Panel>

      <Panel title="CIS Status Guide">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Net Status</div>
              <div className="text-muted">20% CIS deduction applied</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <XCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Gross Status</div>
              <div className="text-muted">30% CIS deduction applied</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Unverified</div>
              <div className="text-muted">Verify with HMRC before use</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-muted flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Unmatched</div>
              <div className="text-muted">UTR not found in HMRC system</div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

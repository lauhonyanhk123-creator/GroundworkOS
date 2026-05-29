'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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

interface AddForm {
  company_name: string;
  contact_name: string;
  trade: string;
  utr_number: string;
  email: string;
  phone: string;
  notes: string;
}

export default function SubcontractorsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [subcontractors, setSubcontractors] = useState<SubcontractorRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>({
    company_name: '', contact_name: '', trade: '', utr_number: '',
    email: '', phone: '', notes: '',
  });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addFormError, setAddFormError] = useState<string | null>(null);

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

  async function handleAddSubcontractor() {
    if (!addForm.company_name.trim()) { setAddFormError('Company name is required.'); return; }
    setAddSubmitting(true);
    setAddFormError(null);
    try {
      const { data: uc } = await supabase.current
        .from('user_companies')
        .select('company_id')
        .single();
      if (!uc?.company_id) throw new Error('No company associated with this account.');

      const { error } = await supabase.current.from('subcontractors').insert({
        company_name: addForm.company_name.trim(),
        contact_name: addForm.contact_name || null,
        trade: addForm.trade || null,
        utr_number: addForm.utr_number || null,
        email: addForm.email || null,
        phone: addForm.phone || null,
        notes: addForm.notes || null,
        company_id: uc.company_id,
        cis_status: 'unverified',
      });
      if (error) throw error;
      setShowAddModal(false);
      setAddForm({ company_name: '', contact_name: '', trade: '', utr_number: '', email: '', phone: '', notes: '' });
      await loadSubcontractors();
    } catch (err) {
      setAddFormError(err instanceof Error ? err.message : 'Failed to add subcontractor. Please try again.');
    } finally {
      setAddSubmitting(false);
    }
  }

  async function handleVerifyCIS(subId: string, utrNumber: string | null) {
    try {
      await supabase.current
        .from('subcontractors')
        .update({ cis_status: utrNumber ? 'net' : 'unverified', cis_verified_at: new Date().toISOString() })
        .eq('id', subId);
      await loadSubcontractors();
    } catch (err) {
      console.error('[Subcontractors] verify CIS error', err);
    }
  }

  const showWarning = subcontractors.some(s => s.cis_status === 'unverified' || s.has_expiring_documents);

  function getCISIcon(status: string) {
    switch (status) {
      case 'net': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'unverified':
      case 'unmatched': return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'gross': return <XCircle className="w-4 h-4 text-danger" />;
      default: return null;
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
        <Button onClick={() => setShowAddModal(true)}>
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
                    <Button variant="ghost" size="sm" onClick={() => handleVerifyCIS(sub.id, sub.utr_number ?? null)}>
                      Verify CIS
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/subcontractors/${sub.id}`)}>
                    View
                  </Button>
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

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-condensed font-bold">Add Subcontractor</h2>
            </div>
            <div className="p-6 space-y-4">
              {addFormError && (
                <div className="p-3 rounded bg-danger/10 border border-danger/30 text-danger text-sm">{addFormError}</div>
              )}
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Company Name *</label>
                <input
                  type="text"
                  value={addForm.company_name}
                  onChange={(e) => setAddForm(f => ({ ...f, company_name: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Contact Name</label>
                  <input
                    type="text"
                    value={addForm.contact_name}
                    onChange={(e) => setAddForm(f => ({ ...f, contact_name: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Trade</label>
                  <input
                    type="text"
                    value={addForm.trade}
                    onChange={(e) => setAddForm(f => ({ ...f, trade: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                    placeholder="e.g. Drainage, Groundworks"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">UTR Number</label>
                  <input
                    type="text"
                    value={addForm.utr_number}
                    onChange={(e) => setAddForm(f => ({ ...f, utr_number: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                    placeholder="10-digit UTR"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Phone</label>
                  <input
                    type="tel"
                    value={addForm.phone}
                    onChange={(e) => setAddForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Email</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Notes</label>
                <textarea
                  rows={3}
                  value={addForm.notes}
                  onChange={(e) => setAddForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setShowAddModal(false); setAddFormError(null); }}>Cancel</Button>
              <Button onClick={handleAddSubcontractor} loading={addSubmitting} disabled={addSubmitting}>Add Subcontractor</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

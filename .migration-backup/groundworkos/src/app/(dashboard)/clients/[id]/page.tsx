'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Mail, Phone, MapPin, Building2, Briefcase, Receipt } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Client, Job, Invoice } from '@/types';

const tabs = [
  { id: 'overview', label: 'Overview', icon: Building2 },
  { id: 'jobs', label: 'Jobs', icon: Briefcase },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
];

interface EditForm {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  companies_house_number: string;
  notes: string;
}

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [client, setClient] = useState<Client | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    company_name: '', contact_name: '', email: '', phone: '',
    address: '', companies_house_number: '', notes: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const supabase = useRef(createClient());

  useEffect(() => {
    async function load() {
      try {
        const [
          { data: clientData, error: clientError },
          { data: jobsData },
          { data: invoicesData },
        ] = await Promise.all([
          supabase.current.from('clients').select('*').eq('id', clientId).single(),
          supabase.current.from('jobs').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
          supabase.current.from('invoices').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        ]);
        if (clientError) throw clientError;
        if (!clientData) { setError('Client not found.'); return; }
        setClient(clientData as Client);
        setEditForm({
          company_name: clientData.company_name,
          contact_name: clientData.contact_name ?? '',
          email: clientData.email ?? '',
          phone: clientData.phone ?? '',
          address: clientData.address ?? '',
          companies_house_number: clientData.companies_house_number ?? '',
          notes: clientData.notes ?? '',
        });
        setJobs((jobsData ?? []) as Job[]);
        setInvoices((invoicesData ?? []) as Invoice[]);
      } catch (err) {
        console.error('[ClientDetail]', err);
        setError('Failed to load client. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [clientId]);

  async function handleEditClient() {
    if (!editForm.company_name.trim()) { setEditError('Company name is required.'); return; }
    setEditSubmitting(true);
    setEditError(null);
    try {
      const { error } = await supabase.current.from('clients').update({
        company_name: editForm.company_name.trim(),
        contact_name: editForm.contact_name || null,
        email: editForm.email || null,
        phone: editForm.phone || null,
        address: editForm.address || null,
        companies_house_number: editForm.companies_house_number || null,
        notes: editForm.notes || null,
      }).eq('id', clientId);
      if (error) throw error;
      const { data: updated } = await supabase.current.from('clients').select('*').eq('id', clientId).single();
      if (updated) setClient(updated as Client);
      setShowEditModal(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update client. Please try again.');
    } finally {
      setEditSubmitting(false);
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

  if (error || !client) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-danger mb-2">{error ?? 'Client not found'}</p>
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>Go back</Button>
        </div>
      </div>
    );
  }

  const totalJobValue = jobs.reduce((sum, job) => sum + (job.value ?? 0), 0);
  const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <div>
            <h1 className="text-2xl font-condensed font-bold">{client.company_name}</h1>
            {client.contact_name && <p className="text-muted text-sm mt-1">{client.contact_name}</p>}
          </div>
        </div>
        <Button onClick={() => setShowEditModal(true)}>Edit Client</Button>
      </div>

      <Panel>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-yellow" />
            </div>
            <div>
              <div className="text-xs font-mono text-muted uppercase tracking-wider">Company</div>
              <div className="font-medium">{client.company_name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center">
              <Mail className="w-5 h-5 text-muted" />
            </div>
            <div>
              <div className="text-xs font-mono text-muted uppercase tracking-wider">Email</div>
              <div className="font-medium">{client.email ?? '—'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center">
              <Phone className="w-5 h-5 text-muted" />
            </div>
            <div>
              <div className="text-xs font-mono text-muted uppercase tracking-wider">Phone</div>
              <div className="font-medium">{client.phone ?? '—'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-muted" />
            </div>
            <div>
              <div className="text-xs font-mono text-muted uppercase tracking-wider">Address</div>
              <div className="font-medium truncate">{client.address ?? '—'}</div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="flex items-center gap-2 bg-surface border border-border rounded p-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors',
                activeTab === tab.id ? 'bg-yellow text-black' : 'text-muted hover:text-text'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <Panel>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {client.notes && (
              <div>
                <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-2">Notes</h4>
                <p className="text-sm">{client.notes}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-2">Companies House</h4>
                <p className="font-mono text-sm">{client.companies_house_number ?? 'Not registered'}</p>
              </div>
              <div>
                <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-2">Client Since</h4>
                <p className="font-mono text-sm">{formatDate(client.created_at)}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
              <div className="text-center">
                <div className="text-2xl font-condensed font-bold">{jobs.length}</div>
                <div className="text-xs text-muted mt-1">Total Jobs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-condensed font-bold">{formatCurrency(totalJobValue)}</div>
                <div className="text-xs text-muted mt-1">Total Value</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-condensed font-bold">{paidInvoices}/{invoices.length}</div>
                <div className="text-xs text-muted mt-1">Paid Invoices</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="space-y-3">
            {jobs.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No jobs found for this client.</p>
            ) : (
              jobs.map(job => (
                <div key={job.id} className="flex items-center gap-4 p-4 bg-surface-2 rounded">
                  <div className="font-mono text-sm text-muted w-20">{job.job_number}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{job.title}</div>
                    <div className="text-xs text-muted">{job.value ? formatCurrency(job.value) : '—'}</div>
                  </div>
                  <Badge status={job.status} />
                  <div className="w-24">
                    <div className="w-full bg-surface-3 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-yellow" style={{ width: `${job.progress_percent}%` }} />
                    </div>
                    <div className="text-xs text-muted text-right mt-1">{job.progress_percent}%</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-3">
            {invoices.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No invoices found for this client.</p>
            ) : (
              invoices.map(invoice => (
                <div key={invoice.id} className="flex items-center gap-4 p-4 bg-surface-2 rounded">
                  <div className="font-mono text-sm text-muted w-24">{invoice.invoice_number}</div>
                  <div className="flex-1" />
                  <Badge status={invoice.status} />
                  <div className="text-right">
                    <div className="font-mono font-medium">{formatCurrency(invoice.total_amount)}</div>
                    {invoice.due_date && (
                      <div className="text-xs text-muted">{formatDate(invoice.due_date)}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Panel>

      {/* Edit Client Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-condensed font-bold">Edit Client</h2>
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
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Companies House No.</label>
                  <input
                    type="text"
                    value={editForm.companies_house_number}
                    onChange={(e) => setEditForm(f => ({ ...f, companies_house_number: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Address</label>
                <textarea
                  rows={3}
                  value={editForm.address}
                  onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow resize-none"
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
              <Button onClick={handleEditClient} loading={editSubmitting} disabled={editSubmitting}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

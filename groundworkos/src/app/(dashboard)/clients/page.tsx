'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Building2, Mail, Phone, MapPin } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Client } from '@/types';

type ClientRow = Client & { job_count: number };

interface NewClientForm {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  companies_house_number: string;
}

const EMPTY_FORM: NewClientForm = {
  company_name: '', contact_name: '', email: '', phone: '', address: '', companies_house_number: '',
};

export default function ClientsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<NewClientForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const supabase = useRef(createClient());

  async function loadClients() {
    try {
      const [{ data: clientData, error: clientError }, { data: jobData }] = await Promise.all([
        supabase.current.from('clients').select('*').order('company_name'),
        supabase.current.from('jobs').select('client_id').not('status', 'in', '("complete","cancelled")'),
      ]);
      if (clientError) throw clientError;
      const jobCounts = (jobData ?? []).reduce<Record<string, number>>((acc, j) => {
        if (j.client_id) acc[j.client_id] = (acc[j.client_id] ?? 0) + 1;
        return acc;
      }, {});
      setClients((clientData ?? []).map(c => ({ ...c, job_count: jobCounts[c.id] ?? 0 })));
    } catch (err) {
      console.error('[Clients]', err);
      setError('Failed to load clients. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadClients(); }, []);

  async function handleCreateClient() {
    if (!form.company_name.trim()) { setFormError('Company name is required.'); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      const { data: { user } } = await supabase.current.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: uc } = await supabase.current
        .from('user_companies').select('company_id').eq('user_id', user.id).single();
      if (!uc?.company_id) throw new Error('No company found');

      const { error } = await supabase.current.from('clients').insert({
        company_id: uc.company_id,
        company_name: form.company_name.trim(),
        contact_name: form.contact_name || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        companies_house_number: form.companies_house_number || null,
      });
      if (error) throw error;
      setShowNewClientModal(false);
      setForm(EMPTY_FORM);
      await loadClients();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create client. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredClients = clients.filter(c =>
    c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.contact_name ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-danger mb-2">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => { setError(null); setIsLoading(true); loadClients(); }}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-condensed font-bold">Clients</h1>
          <p className="text-muted text-sm mt-1">Manage your client database</p>
        </div>
        <Button onClick={() => setShowNewClientModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Client
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface border border-border rounded pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-yellow"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded" />)
        ) : filteredClients.length > 0 ? (
          filteredClients.map(client => (
            <div
              key={client.id}
              onClick={() => router.push(`/clients/${client.id}`)}
              className="bg-surface border border-border rounded p-4 hover:border-yellow transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-yellow" />
                  <h3 className="font-medium">{client.company_name}</h3>
                </div>
                {client.companies_house_number && (
                  <span className="text-xs font-mono text-muted">{client.companies_house_number}</span>
                )}
              </div>
              <div className="space-y-2 text-sm">
                {client.contact_name && (
                  <div className="flex items-center gap-2 text-muted">
                    <span className="font-medium text-text">{client.contact_name}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-muted">
                    <Phone className="w-3 h-3" />
                    <span className="truncate">{client.phone}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2 text-muted">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-start gap-2 text-muted">
                    <MapPin className="w-3 h-3 mt-0.5" />
                    <span className="truncate text-xs">{client.address}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <div className="text-xs text-muted">{client.job_count} active job{client.job_count !== 1 ? 's' : ''}</div>
                <div className="text-xs font-mono text-muted">
                  Since {new Date(client.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-muted">
            <p>No clients found</p>
          </div>
        )}
      </div>

      {showNewClientModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-condensed font-bold">Create New Client</h2>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded bg-danger/10 border border-danger text-danger text-sm">{formError}</div>
              )}
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Company Name *</label>
                <input
                  type="text"
                  placeholder="Enter company name..."
                  value={form.company_name}
                  onChange={(e) => setForm(f => ({ ...f, company_name: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Contact Name</label>
                <input
                  type="text"
                  placeholder="Enter contact name..."
                  value={form.contact_name}
                  onChange={(e) => setForm(f => ({ ...f, contact_name: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={form.email}
                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="07700 900123"
                    value={form.phone}
                    onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Address</label>
                <textarea
                  placeholder="Enter address..."
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Companies House Number</label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={form.companies_house_number}
                  onChange={(e) => setForm(f => ({ ...f, companies_house_number: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setShowNewClientModal(false); setForm(EMPTY_FORM); setFormError(null); }}>
                Cancel
              </Button>
              <Button onClick={handleCreateClient} loading={submitting} disabled={submitting}>
                Create Client
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

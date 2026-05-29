'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Download } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Invoice, Client, Job } from '@/types';

type InvoiceRow = Invoice & {
  client: { company_name: string } | null;
  job: { title: string } | null;
};

interface InvoiceForm {
  client_id: string;
  job_id: string;
  quote_id: string;
  subtotal: string;
  due_date: string;
  notes: string;
}

export default function InvoicesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState<InvoiceForm>({
    client_id: '', job_id: '', quote_id: '', subtotal: '', due_date: '', notes: '',
  });
  const [invoiceClients, setInvoiceClients] = useState<Pick<Client, 'id' | 'company_name'>[]>([]);
  const [invoiceJobs, setInvoiceJobs] = useState<Pick<Job, 'id' | 'job_number' | 'title'>[]>([]);
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [invoiceFormError, setInvoiceFormError] = useState<string | null>(null);

  const supabase = useRef(createClient());

  async function loadInvoices() {
    try {
      const { data, error } = await supabase.current
        .from('invoices')
        .select('*, client:clients(company_name), job:jobs(title)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInvoices((data ?? []) as InvoiceRow[]);
    } catch (err) {
      console.error('[Invoices]', err);
      setError('Failed to load invoices. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDropdownData() {
    const [{ data: clients }, { data: jobs }] = await Promise.all([
      supabase.current.from('clients').select('id, company_name').order('company_name').limit(100),
      supabase.current.from('jobs').select('id, job_number, title').order('created_at', { ascending: false }).limit(100),
    ]);
    setInvoiceClients((clients ?? []) as Pick<Client, 'id' | 'company_name'>[]);
    setInvoiceJobs((jobs ?? []) as Pick<Job, 'id' | 'job_number' | 'title'>[]);
  }

  useEffect(() => {
    loadInvoices();
    loadDropdownData();
  }, []);

  async function markPaid(invoiceId: string) {
    const { error } = await supabase.current
      .from('invoices')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', invoiceId);
    if (!error) await loadInvoices();
  }

  async function handleCreateInvoice() {
    if (!invoiceForm.client_id) { setInvoiceFormError('Please select a client.'); return; }
    const subtotalNum = parseFloat(invoiceForm.subtotal);
    if (isNaN(subtotalNum) || subtotalNum <= 0) { setInvoiceFormError('Subtotal must be greater than 0.'); return; }
    if (!invoiceForm.due_date) { setInvoiceFormError('Due date is required.'); return; }

    setInvoiceSubmitting(true);
    setInvoiceFormError(null);
    try {
      const { data: uc } = await supabase.current
        .from('user_companies')
        .select('company_id')
        .single();
      if (!uc?.company_id) throw new Error('No company associated with this account.');

      const { data: invoiceNumData, error: invoiceNumError } = await supabase.current.rpc('generate_invoice_number');
      if (invoiceNumError || !invoiceNumData) throw new Error('Failed to generate invoice number.');

      const vatAmount = Math.round(subtotalNum * 0.2 * 100) / 100;
      const totalAmount = Math.round(subtotalNum * 1.2 * 100) / 100;

      const { error } = await supabase.current.from('invoices').insert({
        company_id: uc.company_id,
        invoice_number: invoiceNumData as string,
        client_id: invoiceForm.client_id,
        job_id: invoiceForm.job_id || null,
        quote_id: invoiceForm.quote_id || null,
        subtotal: subtotalNum,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        due_date: invoiceForm.due_date,
        notes: invoiceForm.notes || null,
        status: 'draft',
      });
      if (error) throw error;

      setShowNewInvoiceModal(false);
      setInvoiceForm({ client_id: '', job_id: '', quote_id: '', subtotal: '', due_date: '', notes: '' });
      await loadInvoices();
    } catch (err) {
      setInvoiceFormError(err instanceof Error ? err.message : 'Failed to create invoice. Please try again.');
    } finally {
      setInvoiceSubmitting(false);
    }
  }

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalOutstanding = invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'draft').reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  const subtotalNum = parseFloat(invoiceForm.subtotal) || 0;
  const computedVat = Math.round(subtotalNum * 0.2 * 100) / 100;
  const computedTotal = Math.round(subtotalNum * 1.2 * 100) / 100;

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-danger mb-2">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => { setError(null); setIsLoading(true); loadInvoices(); }}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-condensed font-bold">Invoices</h1>
          <p className="text-muted text-sm mt-1">Track and manage invoices</p>
        </div>
        <Button onClick={() => setShowNewInvoiceModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Panel className="!p-4">
          <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Total Invoiced</div>
          <div className="text-3xl font-condensed font-bold">{formatCurrency(totalInvoiced)}</div>
        </Panel>
        <Panel className="!p-4">
          <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Total Paid</div>
          <div className="text-3xl font-condensed font-bold text-success">{formatCurrency(totalPaid)}</div>
        </Panel>
        <Panel className="!p-4">
          <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Outstanding</div>
          <div className="text-3xl font-condensed font-bold text-warning">{formatCurrency(totalOutstanding)}</div>
        </Panel>
      </div>

      <Panel>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded" />)}
          </div>
        ) : invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs font-mono text-muted uppercase tracking-wider border-b border-border">
                  <th className="text-left py-3 px-4">Invoice</th>
                  <th className="text-left py-3 px-4">Client</th>
                  <th className="text-left py-3 px-4">Job</th>
                  <th className="text-right py-3 px-4">Amount</th>
                  <th className="text-center py-3 px-4">Due Date</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(invoice => {
                  const isOverdue = invoice.status === 'overdue';
                  return (
                    <tr
                      key={invoice.id}
                      className={cn('border-b border-border last:border-0', isOverdue && 'bg-danger/5')}
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono text-sm">{invoice.invoice_number}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{invoice.client?.company_name ?? '—'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-muted truncate max-w-xs">{invoice.job?.title ?? '—'}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-medium">{formatCurrency(invoice.total_amount)}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className={cn('font-mono text-sm', isOverdue && 'text-danger font-semibold')}>
                          {invoice.due_date ? formatDate(invoice.due_date) : '—'}
                          {isOverdue && <span className="ml-1 text-xs">(Overdue)</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge status={invoice.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {invoice.status !== 'paid' && (
                            <Button variant="ghost" size="sm" onClick={() => markPaid(invoice.id)}>
                              Mark Paid
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted">
            <p>No invoices found</p>
          </div>
        )}
      </Panel>

      {showNewInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-condensed font-bold">New Invoice</h2>
            </div>
            <div className="p-6 space-y-4">
              {invoiceFormError && (
                <div className="p-3 rounded bg-danger/10 border border-danger/30 text-danger text-sm">{invoiceFormError}</div>
              )}
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Client *</label>
                <select
                  value={invoiceForm.client_id}
                  onChange={(e) => setInvoiceForm(f => ({ ...f, client_id: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                >
                  <option value="">— Select a client —</option>
                  {invoiceClients.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Job (Optional)</label>
                <select
                  value={invoiceForm.job_id}
                  onChange={(e) => setInvoiceForm(f => ({ ...f, job_id: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                >
                  <option value="">— Select a job (optional) —</option>
                  {invoiceJobs.map(j => (
                    <option key={j.id} value={j.id}>{j.job_number} — {j.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Subtotal (£) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={invoiceForm.subtotal}
                  onChange={(e) => setInvoiceForm(f => ({ ...f, subtotal: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  placeholder="0.00"
                />
              </div>
              {subtotalNum > 0 && (
                <div className="bg-surface-2 rounded p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">VAT (20%)</span>
                    <span className="font-mono">{formatCurrency(computedVat)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1">
                    <span>Total</span>
                    <span className="font-mono text-yellow">{formatCurrency(computedTotal)}</span>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Due Date *</label>
                <input
                  type="date"
                  value={invoiceForm.due_date}
                  onChange={(e) => setInvoiceForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Notes</label>
                <textarea
                  rows={3}
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setShowNewInvoiceModal(false); setInvoiceFormError(null); }}>Cancel</Button>
              <Button onClick={handleCreateInvoice} loading={invoiceSubmitting} disabled={invoiceSubmitting}>Create Invoice</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Download, CheckCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Invoice, Client, Job } from '@/types';

type InvoiceDetail = Invoice & {
  client: Pick<Client, 'id' | 'company_name' | 'contact_name' | 'email' | 'address'> | null;
  job: Pick<Job, 'id' | 'job_number' | 'title'> | null;
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const supabase = useRef(createClient());

  async function loadInvoice() {
    try {
      const { data, error: fetchError } = await supabase.current
        .from('invoices')
        .select('*, client:clients(id, company_name, contact_name, email, address), job:jobs(id, job_number, title)')
        .eq('id', invoiceId)
        .single();
      if (fetchError) throw fetchError;
      if (!data) { setError('Invoice not found.'); return; }
      setInvoice(data as InvoiceDetail);
    } catch (err) {
      console.error('[InvoiceDetail]', err);
      setError('Failed to load invoice. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadInvoice(); }, [invoiceId]);

  async function handleMarkPaid() {
    setSubmitting(true);
    try {
      const { error } = await supabase.current
        .from('invoices')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', invoiceId);
      if (error) throw error;
      await loadInvoice();
    } catch (err) {
      console.error('[InvoiceDetail] mark paid error', err);
    } finally {
      setSubmitting(false);
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

  if (error || !invoice) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-danger mb-2">{error ?? 'Invoice not found'}</p>
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>Go back</Button>
        </div>
      </div>
    );
  }

  const isOverdue = invoice.status === 'overdue';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <div>
            <h1 className="text-2xl font-condensed font-bold">{invoice.invoice_number}</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="font-mono text-sm text-muted">
                {invoice.client?.company_name ?? '—'}
              </span>
              <Badge status={invoice.status} />
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          {invoice.status !== 'paid' && (
            <Button variant="ghost" onClick={handleMarkPaid} loading={submitting} disabled={submitting}>
              <CheckCircle className="w-4 h-4 mr-2" />Mark Paid
            </Button>
          )}
          <Button variant="ghost">
            <Download className="w-4 h-4 mr-2" />Download PDF
          </Button>
        </div>
      </div>

      <Panel>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Total Amount</div>
            <div className="text-2xl font-condensed font-bold">{formatCurrency(invoice.total_amount)}</div>
          </div>
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Due Date</div>
            <div className={`text-lg font-condensed ${isOverdue ? 'text-danger font-bold' : ''}`}>
              {invoice.due_date ? formatDate(invoice.due_date) : '—'}
              {isOverdue && <span className="ml-2 text-sm">(Overdue)</span>}
            </div>
          </div>
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Created</div>
            <div className="text-lg font-condensed">{formatDate(invoice.created_at)}</div>
          </div>
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Paid At</div>
            <div className="text-lg font-condensed text-success">
              {invoice.paid_at ? formatDate(invoice.paid_at) : '—'}
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Client">
          {invoice.client ? (
            <div className="space-y-2">
              <div className="font-medium text-lg">{invoice.client.company_name}</div>
              {invoice.client.contact_name && (
                <div className="text-sm text-muted">{invoice.client.contact_name}</div>
              )}
              {invoice.client.email && (
                <div className="text-sm text-muted">{invoice.client.email}</div>
              )}
              {invoice.client.address && (
                <div className="text-sm text-muted whitespace-pre-line">{invoice.client.address}</div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">No client attached.</p>
          )}
        </Panel>

        <Panel title="Job">
          {invoice.job ? (
            <div className="space-y-2">
              <div className="font-mono text-sm text-muted">{invoice.job.job_number}</div>
              <div className="font-medium">{invoice.job.title}</div>
            </div>
          ) : (
            <p className="text-sm text-muted">No job attached.</p>
          )}
        </Panel>
      </div>

      <Panel title="Invoice Breakdown">
        <div className="space-y-2 max-w-xs ml-auto">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">VAT (20%)</span>
            <span className="font-mono">{formatCurrency(invoice.vat_amount)}</span>
          </div>
          <div className="flex justify-between items-baseline pt-2 border-t border-border">
            <span className="font-semibold">Total</span>
            <span className="text-2xl font-condensed font-bold text-yellow">{formatCurrency(invoice.total_amount)}</span>
          </div>
        </div>
      </Panel>

      {invoice.notes && (
        <Panel title="Notes">
          <p className="text-sm">{invoice.notes}</p>
        </Panel>
      )}
    </div>
  );
}

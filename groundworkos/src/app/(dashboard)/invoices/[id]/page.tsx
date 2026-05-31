'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Download, CheckCircle, Send } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Invoice, Client, Job, StatusHistory } from '@/types';

type InvoiceDetail = Invoice & {
  client: Pick<Client, 'id' | 'company_name' | 'contact_name' | 'email' | 'address'> | null;
  job: Pick<Job, 'id' | 'job_number' | 'title'> | null;
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const supabase = useRef(createClient());

  async function loadInvoice() {
    try {
      const [
        { data, error: fetchError },
        { data: histData },
      ] = await Promise.all([
        supabase.current
          .from('invoices')
          .select('*, client:clients(id, company_name, contact_name, email, address), job:jobs(id, job_number, title)')
          .eq('id', invoiceId)
          .single(),
        supabase.current
          .from('status_history')
          .select('*')
          .eq('entity_type', 'invoice')
          .eq('entity_id', invoiceId)
          .order('created_at', { ascending: true }),
      ]);
      if (fetchError) throw fetchError;
      if (!data) { setError('Invoice not found.'); return; }
      setInvoice(data as InvoiceDetail);
      setHistory(histData ?? []);
    } catch (err) {
      console.error('[InvoiceDetail]', err);
      setError('Failed to load invoice. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadInvoice(); }, [invoiceId]);

  async function handleSendInvoice() {
    setSubmitting(true);
    setEmailWarning(null);
    try {
      const { error } = await supabase.current
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoiceId);
      if (error) throw error;
      await loadInvoice();
      const emailRes = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'invoice', id: invoiceId }),
      });
      if (!emailRes.ok) {
        const { error: emailErr } = await emailRes.json().catch(() => ({ error: 'Unknown error' }));
        setEmailWarning(emailErr ?? 'Invoice marked as sent but email could not be delivered.');
      }
    } catch (err) {
      console.error('[InvoiceDetail] send invoice error', err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDownloadPDF() {
    if (!invoice) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const statusLabel = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .company-name { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: ${invoice.status === 'paid' ? '#d1fae5' : invoice.status === 'overdue' ? '#fee2e2' : '#fef9c3'}; color: ${invoice.status === 'paid' ? '#065f46' : invoice.status === 'overdue' ? '#991b1b' : '#713f12'}; }
    .invoice-number { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 8px; margin-top: 32px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
    .address { line-height: 1.6; color: #333; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 32px 0; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; }
    td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
    .right { text-align: right; }
    .totals { max-width: 260px; margin-left: auto; margin-top: 24px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
    .totals-total { display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #111; font-size: 18px; font-weight: 800; }
    .paid-note { margin-top: 24px; padding: 12px 16px; background: #d1fae5; color: #065f46; border-radius: 4px; font-weight: 600; }
    .notes-box { margin-top: 32px; padding: 16px; background: #f9fafb; border-radius: 4px; line-height: 1.6; }
    @media print { body { padding: 32px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">GroundworkOS</div>
    </div>
    <div style="text-align:right">
      <div class="invoice-number">${invoice.invoice_number}</div>
      <span class="badge">${statusLabel}</span>
    </div>
  </div>

  <div class="grid">
    <div>
      <h2>Billed To</h2>
      <div class="address">
        <strong>${invoice.client?.company_name ?? '—'}</strong><br/>
        ${invoice.client?.contact_name ? `${invoice.client.contact_name}<br/>` : ''}
        ${invoice.client?.email ? `${invoice.client.email}<br/>` : ''}
        ${invoice.client?.address ? `${invoice.client.address.replace(/\n/g, '<br/>')}` : ''}
      </div>
    </div>
    <div>
      <h2>Invoice Details</h2>
      <div class="address">
        <strong>Issued:</strong> ${formatDate(invoice.created_at)}<br/>
        <strong>Due:</strong> ${invoice.due_date ? formatDate(invoice.due_date) : '—'}<br/>
        ${invoice.job ? `<strong>Job:</strong> ${invoice.job.job_number} — ${invoice.job.title}<br/>` : ''}
        ${invoice.paid_at ? `<strong>Paid:</strong> ${formatDate(invoice.paid_at)}<br/>` : ''}
      </div>
    </div>
  </div>

  <hr class="divider"/>

  <div class="totals">
    <div class="totals-row"><span style="color:#666">Subtotal</span><span>£${(invoice.subtotal ?? 0).toFixed(2)}</span></div>
    <div class="totals-row"><span style="color:#666">VAT (20%)</span><span>£${(invoice.vat_amount ?? 0).toFixed(2)}</span></div>
    <div class="totals-total"><span>Total</span><span>£${(invoice.total_amount ?? 0).toFixed(2)}</span></div>
  </div>

  ${invoice.status === 'paid' ? `<div class="paid-note">Payment received — thank you.</div>` : ''}
  ${invoice.notes ? `<h2 style="margin-top:32px">Notes</h2><div class="notes-box">${invoice.notes}</div>` : ''}

  <script>window.onload=function(){window.print();}</script>
</body>
</html>`;
    w.document.write(html);
    w.document.close();
  }

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
          {invoice.status === 'draft' && (
            <Button variant="ghost" onClick={handleSendInvoice} loading={submitting} disabled={submitting}>
              <Send className="w-4 h-4 mr-2" />Send Invoice
            </Button>
          )}
          {invoice.status !== 'paid' && (
            <Button variant="ghost" onClick={handleMarkPaid} loading={submitting} disabled={submitting}>
              <CheckCircle className="w-4 h-4 mr-2" />Mark Paid
            </Button>
          )}
          <Button variant="ghost" onClick={handleDownloadPDF}>
            <Download className="w-4 h-4 mr-2" />Download PDF
          </Button>
        </div>
      </div>

      {emailWarning && (
        <div className="p-3 rounded bg-warning/10 border border-warning/30 text-warning text-sm">
          ⚠️ {emailWarning}
        </div>
      )}

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

      <Panel title="Status History">
        {history.length === 0 ? (
          <p className="text-sm text-muted">No status changes recorded.</p>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-4">
              {history.map((item, index) => (
                <div key={item.id} className="relative pl-12">
                  <div className={cn(
                    'absolute left-2 top-0 w-5 h-5 rounded-full border-2',
                    index === history.length - 1 ? 'bg-yellow border-yellow' : 'bg-surface-2 border-border'
                  )} />
                  <div className="flex items-center justify-between">
                    <Badge status={item.new_status} />
                    <span className="text-xs text-muted font-mono">{formatDate(item.created_at)}</span>
                  </div>
                  {item.old_status && (
                    <p className="text-xs text-muted mt-1 font-mono">
                      {item.old_status} &rarr; {item.new_status}
                    </p>
                  )}
                  {item.notes && <p className="text-sm text-muted mt-1">{item.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

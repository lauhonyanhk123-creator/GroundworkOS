'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Send, Check, FileDown, RefreshCw } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Quote, Client, LineItem, StatusHistory } from '@/types';

type QuoteDetail = Quote & {
  client: Pick<Client, 'id' | 'company_name' | 'contact_name' | 'email'> | null;
};

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [converting, setConverting] = useState(false);
  const supabase = useRef(createClient());

  async function loadQuote() {
    try {
      const [
        { data, error: fetchError },
        { data: histData },
      ] = await Promise.all([
        supabase.current
          .from('quotes')
          .select('*, client:clients(id, company_name, contact_name, email)')
          .eq('id', quoteId)
          .single(),
        supabase.current
          .from('status_history')
          .select('*')
          .eq('entity_type', 'quote')
          .eq('entity_id', quoteId)
          .order('created_at', { ascending: true }),
      ]);
      if (fetchError) throw fetchError;
      if (!data) { setError('Quote not found.'); return; }
      setQuote(data as QuoteDetail);
      setHistory(histData ?? []);
    } catch (err) {
      console.error('[QuoteDetail]', err);
      setError('Failed to load quote. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadQuote(); }, [quoteId]);

  async function handleStatusChange(newStatus: Quote['status']) {
    if (!quote) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const update: Partial<Quote> = { status: newStatus };
      if (newStatus === 'sent') update.sent_at = new Date().toISOString();
      if (newStatus === 'accepted') update.accepted_at = new Date().toISOString();

      const { error } = await supabase.current.from('quotes').update(update).eq('id', quoteId);
      if (error) throw error;
      await loadQuote();

      if (newStatus === 'sent') {
        const emailRes = await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'quote', id: quoteId }),
        });
        if (!emailRes.ok) {
          const { error: emailErr } = await emailRes.json().catch(() => ({ error: 'Unknown error' }));
          setActionError(emailErr ?? 'Quote marked as sent but email could not be delivered.');
        }
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConvertToJob() {
    if (!quote) return;
    setConverting(true);
    setActionError(null);
    try {
      const { data: jobNumData, error: jobNumError } = await supabase.current.rpc('generate_job_number');
      if (jobNumError || !jobNumData) throw new Error('Failed to generate job number.');

      const { data: jobData, error: jobInsertError } = await supabase.current
        .from('jobs')
        .insert({
          company_id: quote.company_id,
          job_number: jobNumData as string,
          client_id: quote.client_id,
          title: quote.title ?? quote.quote_number,
          value: quote.total_amount,
          status: 'active',
          progress_percent: 0,
        })
        .select()
        .single();
      if (jobInsertError || !jobData) throw new Error(jobInsertError?.message ?? 'Failed to create job.');

      const { error: updateError } = await supabase.current
        .from('quotes')
        .update({ job_id: jobData.id })
        .eq('id', quoteId);
      if (updateError) throw new Error(updateError.message);

      router.push(`/jobs/${jobData.id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to convert to job. Please try again.');
      setConverting(false);
    }
  }

  async function handleDownloadPDF() {
    if (!quote) return;
    try {
      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'quote', id: quote.id }),
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quote.quote_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[QuoteDetail] PDF download error', err);
    }
  }

  const lineItems = (quote?.line_items ?? []) as LineItem[];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-64 rounded" />
        <Skeleton className="h-48 rounded" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-danger mb-2">{error ?? 'Quote not found'}</p>
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>Go back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <div>
            <h1 className="text-2xl font-condensed font-bold">{quote.title ?? quote.quote_number}</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="font-mono text-sm text-muted">{quote.quote_number}</span>
              <Badge status={quote.status} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          {actionError && <p className="text-danger text-sm">{actionError}</p>}
          {quote.status === 'draft' && (
            <Button variant="ghost" onClick={() => handleStatusChange('sent')} disabled={submitting}>
              <Send className="w-4 h-4 mr-2" />Send Quote
            </Button>
          )}
          {quote.status === 'sent' && (
            <>
              <Button variant="ghost" onClick={() => handleStatusChange('accepted')} disabled={submitting}>
                <Check className="w-4 h-4 mr-2" />Mark Accepted
              </Button>
              <Button variant="ghost" onClick={() => handleStatusChange('sent')} disabled={submitting}>
                <RefreshCw className="w-4 h-4 mr-2" />Resend
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={handleDownloadPDF}>
            <FileDown className="w-4 h-4 mr-2" />Download PDF
          </Button>
        </div>
      </div>

      <Panel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Client</div>
            <div className="font-medium">{quote.client?.company_name ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Contact</div>
            <div className="font-medium">{quote.client?.contact_name ?? '—'}</div>
            {quote.client?.email && <div className="text-sm text-muted">{quote.client.email}</div>}
          </div>
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Dates</div>
            <div className="text-sm">
              Created: {formatDate(quote.created_at)}
              {quote.sent_at && <span className="text-muted ml-2">| Sent: {formatDate(quote.sent_at)}</span>}
              {quote.accepted_at && <span className="text-muted ml-2">| Accepted: {formatDate(quote.accepted_at)}</span>}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Quote Items">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs font-mono text-muted uppercase tracking-wider border-b border-border">
                <th className="text-left py-3 px-4">Description</th>
                <th className="text-right py-3 px-4">Qty</th>
                <th className="text-right py-3 px-4">Unit Price</th>
                <th className="text-right py-3 px-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, index) => (
                <tr key={index} className="border-b border-border last:border-0">
                  <td className="py-3 px-4">{item.description}</td>
                  <td className="py-3 px-4 text-right font-mono">{item.quantity}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatCurrency(item.unit_price)}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatCurrency(item.quantity * item.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 border-t border-border pt-6 space-y-2 max-w-xs ml-auto">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="font-mono">{formatCurrency(quote.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">VAT (20%)</span>
            <span className="font-mono">{formatCurrency(quote.vat_amount)}</span>
          </div>
          <div className="flex justify-between items-baseline pt-2 border-t border-border">
            <span className="font-semibold">Total</span>
            <span className="text-2xl font-condensed font-bold text-yellow">{formatCurrency(quote.total_amount)}</span>
          </div>
        </div>
      </Panel>

      {quote.notes && (
        <Panel title="Notes">
          <p className="text-sm">{quote.notes}</p>
        </Panel>
      )}

      {quote.status === 'accepted' && !quote.job_id && (
        <Panel title="Convert to Job">
          <p className="text-sm text-muted mb-4">This quote has been accepted. Create a job to track the work.</p>
          <Button onClick={handleConvertToJob} loading={converting} disabled={converting}>
            <RefreshCw className="w-4 h-4 mr-2" />Convert to Job
          </Button>
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

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Send, Check, FileDown, RefreshCw } from 'lucide-react';

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
};

type Quote = {
  id: string;
  quote_number: string;
  title: string;
  client: {
    id: string;
    company_name: string;
    contact_name: string;
    email: string;
  };
  line_items: LineItem[];
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  status: string;
  created_at: string;
  sent_at: string | null;
  accepted_at: string | null;
  notes: string;
};

export default function QuoteDetailPage() {
  const params = useParams();
  const quoteId = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    const loadQuote = async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
      setQuote({
        id: quoteId,
        quote_number: 'QT-0012',
        title: 'Newbury Site Preparation',
        client: {
          id: '1',
          company_name: 'Barrett Homes',
          contact_name: 'John Smith',
          email: 'john@barretthomes.co.uk',
        },
        line_items: [
          { id: '1', description: 'Site clearance and preparation', quantity: 1, unit_price: 5000, total: 5000 },
          { id: '2', description: 'Excavation works', quantity: 1, unit_price: 12000, total: 12000 },
          { id: '3', description: 'Drainage installation', quantity: 1, unit_price: 8000, total: 8000 },
          { id: '4', description: 'Foundation concrete pour', quantity: 1, unit_price: 12500, total: 12500 },
          { id: '5', description: 'Backfill and compaction', quantity: 1, unit_price: 2500, total: 2500 },
        ],
        subtotal: 40000,
        vat_amount: 8000,
        total_amount: 48000,
        status: 'sent',
        created_at: '2024-01-10',
        sent_at: '2024-01-12',
        accepted_at: null,
        notes: 'Price valid for 30 days. Work to commence upon acceptance.',
      });
      setIsLoading(false);
    };
    loadQuote();
  }, [quoteId]);

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-64 rounded" />
        <Skeleton className="h-48 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-condensed font-bold">{quote!.title}</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="font-mono text-sm text-muted">{quote!.quote_number}</span>
              <Badge status={quote!.status} />
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          {quote!.status === 'draft' && (
            <Button variant="ghost">
              <Send className="w-4 h-4 mr-2" />
              Send Quote
            </Button>
          )}
          {quote!.status === 'sent' && (
            <>
              <Button variant="ghost">
                <Check className="w-4 h-4 mr-2" />
                Mark Accepted
              </Button>
              <Button variant="ghost">
                <RefreshCw className="w-4 h-4 mr-2" />
                Resend
              </Button>
            </>
          )}
          <Button variant="ghost">
            <FileDown className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Client Info */}
      <Panel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Client</div>
            <div className="font-medium">{quote!.client.company_name}</div>
          </div>
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Contact</div>
            <div className="font-medium">{quote!.client.contact_name}</div>
            <div className="text-sm text-muted">{quote!.client.email}</div>
          </div>
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Dates</div>
            <div className="text-sm">
              Created: {formatDate(quote!.created_at)}
              {quote!.sent_at && <span className="text-muted ml-2">| Sent: {formatDate(quote!.sent_at)}</span>}
            </div>
          </div>
        </div>
      </Panel>

      {/* Line Items */}
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
              {quote!.line_items.map((item, index) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="py-3 px-4">{item.description}</td>
                  <td className="py-3 px-4 text-right font-mono">{item.quantity}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatCurrency(item.unit_price)}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-6 border-t border-border pt-6 space-y-2 max-w-xs ml-auto">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="font-mono">{formatCurrency(quote!.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">VAT (20%)</span>
            <span className="font-mono">{formatCurrency(quote!.vat_amount)}</span>
          </div>
          <div className="flex justify-between items-baseline pt-2 border-t border-border">
            <span className="font-semibold">Total</span>
            <span className="text-2xl font-condensed font-bold text-yellow">{formatCurrency(quote!.total_amount)}</span>
          </div>
        </div>
      </Panel>

      {/* Notes */}
      {quote!.notes && (
        <Panel title="Notes">
          <p className="text-sm">{quote!.notes}</p>
        </Panel>
      )}

      {/* Actions */}
      {quote!.status === 'accepted' && (
        <Panel title="Convert to Job">
          <p className="text-sm text-muted mb-4">This quote has been accepted. Create a job to track the work.</p>
          <Button>
            <RefreshCw className="w-4 h-4 mr-2" />
            Convert to Job
          </Button>
        </Panel>
      )}
    </div>
  );
}

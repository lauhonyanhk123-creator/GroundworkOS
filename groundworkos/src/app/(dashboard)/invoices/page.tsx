'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Download } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Invoice } from '@/types';

type InvoiceRow = Invoice & {
  client: { company_name: string } | null;
  job: { title: string } | null;
};

export default function InvoicesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => { loadInvoices(); }, []);

  async function markPaid(invoiceId: string) {
    const { error } = await supabase.current
      .from('invoices')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', invoiceId);
    if (!error) await loadInvoices();
  }

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalOutstanding = invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'draft').reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

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
        <Button>
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
    </div>
  );
}

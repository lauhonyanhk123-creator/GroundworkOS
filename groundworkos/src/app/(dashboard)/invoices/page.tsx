'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Download, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type Invoice = {
  id: string;
  invoice_number: string;
  client_name: string;
  job_title: string;
  total_amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  is_overdue: boolean;
};

export default function InvoicesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    const loadInvoices = async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
      setInvoices([
        {
          id: '1',
          invoice_number: 'INV-0028',
          client_name: 'Barrett Homes',
          job_title: 'Newbury Site Preparation',
          total_amount: 22500,
          status: 'overdue',
          due_date: '2024-01-15',
          paid_at: null,
          is_overdue: true,
        },
        {
          id: '2',
          invoice_number: 'INV-0027',
          client_name: 'Weston Homes',
          job_title: 'Reading Excavation',
          total_amount: 16000,
          status: 'sent',
          due_date: '2024-02-01',
          paid_at: null,
          is_overdue: false,
        },
        {
          id: '3',
          invoice_number: 'INV-0026',
          client_name: 'Bloor Homes',
          job_title: 'Oxford Foundations',
          total_amount: 58000,
          status: 'paid',
          due_date: '2024-01-01',
          paid_at: '2024-01-05',
          is_overdue: false,
        },
        {
          id: '4',
          invoice_number: 'INV-0025',
          client_name: 'Local Council',
          job_title: 'Swindon Depot',
          total_amount: 8500,
          status: 'draft',
          due_date: '2024-02-15',
          paid_at: null,
          is_overdue: false,
        },
      ]);
      setIsLoading(false);
    };
    loadInvoices();
  }, []);

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalOutstanding = invoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + inv.total_amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-condensed font-bold">Invoices</h1>
          <p className="text-muted text-sm mt-1">Track and manage invoices</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost">
            <RefreshCw className="w-4 h-4 mr-2" />
            Xero Sync
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
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

      {/* Invoices Table */}
      <Panel>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded" />
            ))}
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
                {invoices.map(invoice => (
                  <tr 
                    key={invoice.id} 
                    className={cn(
                      'border-b border-border last:border-0',
                      invoice.is_overdue && 'bg-danger/5'
                    )}
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono text-sm">{invoice.invoice_number}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{invoice.client_name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-muted truncate max-w-xs">{invoice.job_title}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-mono font-medium">{formatCurrency(invoice.total_amount)}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className={cn(
                        'font-mono text-sm',
                        invoice.is_overdue && 'text-danger font-semibold'
                      )}>
                        {formatDate(invoice.due_date)}
                        {invoice.is_overdue && <span className="ml-1 text-xs">(Overdue)</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge status={invoice.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {invoice.status !== 'paid' && (
                          <Button variant="ghost" size="sm">
                            Mark Paid
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
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

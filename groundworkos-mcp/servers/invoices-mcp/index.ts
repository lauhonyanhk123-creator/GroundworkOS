import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { supabase } from '../../shared/db.js';
import { generateInvoiceNumber, calculateLineItemTotals } from '../../shared/utils.js';
import 'dotenv/config';

const server = new McpServer({
  name: 'groundworkos-invoices',
  version: '1.0.0',
});

server.tool(
  'create_invoice',
  'Create an invoice for a completed job',
  {
    client_id: z.string(),
    job_id: z.string().optional(),
    quote_id: z.string().optional(),
    subtotal: z.number(),
    due_date: z.string(),
    notes: z.string().optional(),
  },
  async (args) => {
    const invoiceNumber = await generateInvoiceNumber();

    const { data: client } = await supabase
      .from('clients')
      .select('company_id')
      .eq('id', args.client_id)
      .single();

    const totals = calculateLineItemTotals([{ quantity: 1, unit_price: args.subtotal }]);

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        client_id: args.client_id,
        job_id: args.job_id ?? null,
        quote_id: args.quote_id ?? null,
        subtotal: args.subtotal,
        vat_amount: totals.vat_amount,
        total_amount: totals.total_amount,
        status: 'draft',
        due_date: args.due_date,
        notes: args.notes ?? null,
        company_id: client?.company_id || 'default',
      })
      .select()
      .single();

    if (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.tool(
  'mark_invoice_paid',
  'Mark an invoice as paid',
  {
    invoice_id: z.string(),
  },
  async (args) => {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', args.invoice_id)
      .select()
      .single();

    if (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
        isError: true,
      };
    }

    // Fire-and-forget Xero sync — check if company has a connection and attempt sync.
    // We deliberately do not await this or fail the mark-paid if Xero sync fails.
    if (data?.company_id) {
      const companyId = data.company_id as string;
      supabase
        .from('xero_connections')
        .select('tenant_id')
        .eq('company_id', companyId)
        .maybeSingle()
        .then(({ data: xeroConn }) => {
          if (!xeroConn?.tenant_id) return;
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
          fetch(`${siteUrl}/api/xero/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoice_id: args.invoice_id }),
          }).catch((err: Error) => {
            console.error('[InvoicesMCP] Xero sync failed (non-critical):', err.message);
          });
        })
        .catch((err: Error) => {
          console.error('[InvoicesMCP] Xero connection check failed (non-critical):', err.message);
        });
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.tool(
  'get_outstanding_invoices',
  'Get all unpaid invoices ordered by most overdue first',
  {},
  async () => {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients:client_id (id, company_name, contact_name)
      `)
      .neq('status', 'paid')
      .order('due_date', { ascending: true });

    if (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
        isError: true,
      };
    }

    const invoicesWithDays = (data || []).map((inv: { due_date: string; total_amount: number }) => {
      const dueDate = new Date(inv.due_date);
      const todayDate = new Date(today);
      const diffTime = todayDate.getTime() - dueDate.getTime();
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        ...inv,
        days_overdue: daysOverdue > 0 ? daysOverdue : 0,
        is_overdue: daysOverdue > 0,
      };
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(invoicesWithDays, null, 2) }],
    };
  }
);

server.tool(
  'get_invoice_summary',
  'Get revenue summary for dashboard',
  {
    months_back: z.number().optional().default(6),
  },
  async (args) => {
    const monthsBack = args.months_back ?? 6;

    const paidInvoices = await supabase
      .from('invoices')
      .select('total_amount, paid_at, created_at')
      .eq('status', 'paid');

    const outstandingInvoices = await supabase
      .from('invoices')
      .select('total_amount, status, due_date')
      .neq('status', 'paid');

    const monthlyRevenue: { month: string; total: number; invoice_count: number }[] = [];
    const now = new Date();

    for (let i = 0; i < monthsBack; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = monthDate.toISOString().slice(0, 7);
      const monthLabel = monthDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

      const monthInvoices = (paidInvoices.data || []).filter((inv: { paid_at: string }) => {
        if (!inv.paid_at) return false;
        return inv.paid_at.startsWith(monthStart);
      });

      monthlyRevenue.push({
        month: monthLabel,
        total: monthInvoices.reduce((sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0), 0),
        invoice_count: monthInvoices.length,
      });
    }

    const totalOutstanding = (outstandingInvoices.data || []).reduce(
      (sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0),
      0
    );

    const overdueCount = (outstandingInvoices.data || []).filter((inv: { due_date: string }) => {
      if (!inv.due_date) return false;
      return new Date(inv.due_date) < now;
    }).length;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              monthly_revenue: monthlyRevenue.reverse(),
              total_outstanding: totalOutstanding,
              overdue_count: overdueCount,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  'send_invoice',
  'Mark invoice as sent',
  {
    invoice_id: z.string(),
  },
  async (args) => {
    const { data, error } = await supabase
      .from('invoices')
      .update({ status: 'sent' })
      .eq('id', args.invoice_id)
      .select()
      .single();

    if (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Invoices MCP Server running on stdio');
}

main().catch(console.error);

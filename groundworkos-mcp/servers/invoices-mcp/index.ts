import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { supabase } from '../../shared/db.js';
import { createInvoice, markInvoicePaid, getOutstandingInvoices, getInvoiceSummary, sendInvoice } from './tools.js';
import 'dotenv/config';

const server = new McpServer({ name: 'groundworkos-invoices', version: '1.0.0' });

function wrap(fn: () => Promise<unknown>) {
  return fn().then(data => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }))
    .catch((err: Error) => ({ content: [{ type: 'text' as const, text: JSON.stringify({ error: err.message }) }], isError: true as const }));
}

server.tool('create_invoice', 'Create an invoice for a completed job', {
  client_id: z.string(),
  job_id: z.string().optional(),
  quote_id: z.string().optional(),
  subtotal: z.number(),
  due_date: z.string(),
  notes: z.string().optional(),
}, async (args) => wrap(() => createInvoice(args, supabase, 'default')));

server.tool('mark_invoice_paid', 'Mark an invoice as paid', { invoice_id: z.string() },
  async (args) => wrap(() => markInvoicePaid(args, supabase)));

server.tool('get_outstanding_invoices', 'Get all unpaid invoices ordered by most overdue first', {},
  async () => wrap(() => getOutstandingInvoices(supabase, null)));

server.tool('get_invoice_summary', 'Get revenue summary for dashboard', { months_back: z.number().optional().default(6) },
  async (args) => wrap(() => getInvoiceSummary(args, supabase, null)));

server.tool('send_invoice', 'Mark invoice as sent', { invoice_id: z.string() },
  async (args) => wrap(() => sendInvoice(args, supabase)));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Invoices MCP Server running on stdio');
}

main().catch(console.error);

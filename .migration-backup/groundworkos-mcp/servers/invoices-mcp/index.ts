import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { supabase } from '../../shared/db.js';
import { createInvoice, markInvoicePaid, getOutstandingInvoices, getInvoiceSummary, sendInvoice } from './tools.js';
import 'dotenv/config';

// This stdio server has no authenticated user, so the company scope must be
// provided explicitly. Refuse to start without it rather than defaulting to a
// value that would read across tenants (the DB client bypasses RLS).
const COMPANY_ID = process.env.GROUNDWORKOS_COMPANY_ID;
if (!COMPANY_ID) {
  throw new Error('GROUNDWORKOS_COMPANY_ID must be set to run this MCP server directly.');
}

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
}, async (args) => wrap(() => createInvoice(args, supabase, COMPANY_ID)));

server.tool('mark_invoice_paid', 'Mark an invoice as paid', { invoice_id: z.string() },
  async (args) => wrap(() => markInvoicePaid(args, supabase, COMPANY_ID)));

server.tool('get_outstanding_invoices', 'Get all unpaid invoices ordered by most overdue first', {},
  async () => wrap(() => getOutstandingInvoices(supabase, COMPANY_ID)));

server.tool('get_invoice_summary', 'Get revenue summary for dashboard', { months_back: z.number().optional().default(6) },
  async (args) => wrap(() => getInvoiceSummary(args, supabase, COMPANY_ID)));

server.tool('send_invoice', 'Mark invoice as sent', { invoice_id: z.string() },
  async (args) => wrap(() => sendInvoice(args, supabase, COMPANY_ID)));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Invoices MCP Server running on stdio');
}

main().catch(console.error);

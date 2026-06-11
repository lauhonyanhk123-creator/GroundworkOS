import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { supabase } from '../../shared/db.js';
import { createQuote, updateQuote, deleteQuote, sendQuote, acceptQuote, convertQuoteToJob, listQuotes, getRateBook } from './tools.js';
import 'dotenv/config';

// This stdio server has no authenticated user, so the company scope must be
// provided explicitly. Refuse to start without it rather than defaulting to a
// value that would read across tenants (the DB client bypasses RLS).
const COMPANY_ID = process.env.GROUNDWORKOS_COMPANY_ID;
if (!COMPANY_ID) {
  throw new Error('GROUNDWORKOS_COMPANY_ID must be set to run this MCP server directly.');
}

const server = new McpServer({ name: 'groundworkos-quotes', version: '1.0.0' });

function wrap(fn: () => Promise<unknown>) {
  return fn().then(data => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }))
    .catch((err: Error) => ({ content: [{ type: 'text' as const, text: JSON.stringify({ error: err.message }) }], isError: true as const }));
}

server.tool('create_quote', 'Create a new quote for a client', {
  client_id: z.string().optional(),
  title: z.string(),
  line_items: z.array(z.object({ description: z.string(), quantity: z.number(), unit_price: z.number() })),
  notes: z.string().optional(),
  job_id: z.string().optional(),
}, async (args) => wrap(() => createQuote(args, supabase, COMPANY_ID)));

server.tool('update_quote', 'Update quote line items or notes and recalculate totals', {
  quote_id: z.string(),
  line_items: z.array(z.object({ description: z.string(), quantity: z.number(), unit_price: z.number() })).optional(),
  notes: z.string().optional(),
}, async (args) => wrap(() => updateQuote(args, supabase, COMPANY_ID)));

server.tool('delete_quote', 'Permanently delete a draft quote. Sent, accepted, and rejected quotes cannot be deleted — they are kept for pricing history.', { quote_id: z.string() },
  async (args) => wrap(() => deleteQuote(args, supabase, COMPANY_ID)));

server.tool('send_quote', 'Mark a quote as sent to the client', { quote_id: z.string() },
  async (args) => wrap(() => sendQuote(args, supabase, COMPANY_ID)));

server.tool('accept_quote', 'Mark a quote as accepted by the client', { quote_id: z.string() },
  async (args) => wrap(() => acceptQuote(args, supabase, COMPANY_ID)));

server.tool('convert_quote_to_job', 'Convert an accepted quote into an active job', { quote_id: z.string() },
  async (args) => wrap(() => convertQuoteToJob(args, supabase, COMPANY_ID)));

server.tool('list_quotes', 'List all quotes with optional status filter', {
  status: z.enum(['draft', 'sent', 'accepted', 'rejected']).optional(),
}, async (args) => wrap(() => listQuotes(args, supabase, COMPANY_ID)));

server.tool('get_rate_book', 'Get the company rate book built from historical quote line items: suggested unit rate, price range, win rate and last-used date per work item. Use when asked what to charge, usual rates, or past pricing for an item of work.', {
  search: z.string().optional(),
  limit: z.number().optional(),
}, async (args) => wrap(() => getRateBook(args, supabase, COMPANY_ID)));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Quotes MCP Server running on stdio');
}

main().catch(console.error);

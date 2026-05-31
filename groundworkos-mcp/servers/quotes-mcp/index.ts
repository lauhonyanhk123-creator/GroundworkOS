import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { supabase } from '../../shared/db.js';
import { createQuote, updateQuote, sendQuote, acceptQuote, convertQuoteToJob, listQuotes } from './tools.js';
import 'dotenv/config';

const server = new McpServer({ name: 'groundworkos-quotes', version: '1.0.0' });

function wrap(fn: () => Promise<unknown>) {
  return fn().then(data => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }))
    .catch((err: Error) => ({ content: [{ type: 'text' as const, text: JSON.stringify({ error: err.message }) }], isError: true as const }));
}

server.tool('create_quote', 'Create a new quote for a client', {
  client_id: z.string(),
  title: z.string(),
  line_items: z.array(z.object({ description: z.string(), quantity: z.number(), unit_price: z.number() })),
  notes: z.string().optional(),
  job_id: z.string().optional(),
}, async (args) => wrap(() => createQuote(args, supabase, 'default')));

server.tool('update_quote', 'Update quote line items or notes and recalculate totals', {
  quote_id: z.string(),
  line_items: z.array(z.object({ description: z.string(), quantity: z.number(), unit_price: z.number() })).optional(),
  notes: z.string().optional(),
}, async (args) => wrap(() => updateQuote(args, supabase)));

server.tool('send_quote', 'Mark a quote as sent to the client', { quote_id: z.string() },
  async (args) => wrap(() => sendQuote(args, supabase)));

server.tool('accept_quote', 'Mark a quote as accepted by the client', { quote_id: z.string() },
  async (args) => wrap(() => acceptQuote(args, supabase)));

server.tool('convert_quote_to_job', 'Convert an accepted quote into an active job', { quote_id: z.string() },
  async (args) => wrap(() => convertQuoteToJob(args, supabase)));

server.tool('list_quotes', 'List all quotes with optional status filter', {
  status: z.enum(['draft', 'sent', 'accepted', 'rejected']).optional(),
}, async (args) => wrap(() => listQuotes(args, supabase, null)));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Quotes MCP Server running on stdio');
}

main().catch(console.error);

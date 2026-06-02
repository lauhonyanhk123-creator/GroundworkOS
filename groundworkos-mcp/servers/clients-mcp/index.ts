import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { supabase } from '../../shared/db.js';
import { createClient, getClient, searchClients, getClientHistory, updateClient } from './tools.js';
import 'dotenv/config';

// This stdio server has no authenticated user, so the company scope must be
// provided explicitly. Refuse to start without it rather than defaulting to a
// value that would read across tenants (the DB client bypasses RLS).
const COMPANY_ID = process.env.GROUNDWORKOS_COMPANY_ID;
if (!COMPANY_ID) {
  throw new Error('GROUNDWORKOS_COMPANY_ID must be set to run this MCP server directly.');
}

const server = new McpServer({ name: 'groundworkos-clients', version: '1.0.0' });

function wrap(fn: () => Promise<unknown>) {
  return fn().then(data => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }))
    .catch((err: Error) => ({ content: [{ type: 'text' as const, text: JSON.stringify({ error: err.message }) }], isError: true as const }));
}

server.tool('create_client', 'Create a new client in the CRM', {
  company_name: z.string(),
  contact_name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  companies_house_number: z.string().optional(),
  notes: z.string().optional(),
}, async (args) => wrap(() => createClient(args, supabase, COMPANY_ID)));

server.tool('get_client', 'Get a single client by ID with their stats', { client_id: z.string() },
  async (args) => wrap(() => getClient(args, supabase, COMPANY_ID)));

server.tool('search_clients', 'Search clients by company name or contact name', { query: z.string() },
  async (args) => wrap(() => searchClients(args, supabase, COMPANY_ID)));

server.tool('get_client_history', 'Get full history for a client including jobs, quotes, and invoices', { client_id: z.string() },
  async (args) => wrap(() => getClientHistory(args, supabase, COMPANY_ID)));

server.tool('update_client', 'Update client details', {
  client_id: z.string(),
  company_name: z.string().optional(),
  contact_name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  companies_house_number: z.string().optional(),
  notes: z.string().optional(),
}, async (args) => wrap(() => updateClient(args, supabase, COMPANY_ID)));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Clients MCP Server running on stdio');
}

main().catch(console.error);

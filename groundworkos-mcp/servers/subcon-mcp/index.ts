import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { supabase } from '../../shared/db.js';
import { createSubcontractor, updateSubcontractor, verifyCISStatus, listSubcontractors, getSubcontractorDetails, flagCISIssues } from './tools.js';
import 'dotenv/config';

// This stdio server has no authenticated user, so the company scope must be
// provided explicitly. Refuse to start without it rather than defaulting to a
// value that would read across tenants (the DB client bypasses RLS).
const COMPANY_ID = process.env.GROUNDWORKOS_COMPANY_ID;
if (!COMPANY_ID) {
  throw new Error('GROUNDWORKOS_COMPANY_ID must be set to run this MCP server directly.');
}

const server = new McpServer({ name: 'groundworkos-subcon', version: '1.0.0' });

function wrap(fn: () => Promise<unknown>) {
  return fn().then(data => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }))
    .catch((err: Error) => ({ content: [{ type: 'text' as const, text: JSON.stringify({ error: err.message }) }], isError: true as const }));
}

server.tool('create_subcontractor', 'Create a new subcontractor', {
  company_name: z.string(),
  contact_name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  trade: z.string().optional(),
  utr_number: z.string().optional(),
  notes: z.string().optional(),
}, async (args) => wrap(() => createSubcontractor(args, supabase, COMPANY_ID)));

server.tool('update_subcontractor', 'Edit a subcontractor\'s details (company name, contact, email, phone, trade, UTR, notes). Changing the UTR resets CIS status to unverified.', {
  subcontractor_id: z.string(),
  company_name: z.string().optional(),
  contact_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  trade: z.string().nullable().optional(),
  utr_number: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
}, async (args) => wrap(() => updateSubcontractor(args, supabase, COMPANY_ID)));

server.tool('verify_cis_status', 'Verify a subcontractor\'s CIS status with HMRC', {
  subcontractor_id: z.string(),
  utr_number: z.string(),
}, async (args) => wrap(() => verifyCISStatus(args, supabase, COMPANY_ID)));

server.tool('list_subcontractors', 'List all subcontractors with document counts', {},
  async () => wrap(() => listSubcontractors(supabase, COMPANY_ID)));

server.tool('get_subcontractor_details', 'Get full details for a subcontractor including all documents and payment history', { subcontractor_id: z.string() },
  async (args) => wrap(() => getSubcontractorDetails(args, supabase, COMPANY_ID)));

server.tool('flag_cis_issues', 'Find all subcontractors with unverified or expired CIS documents', {},
  async () => wrap(() => flagCISIssues(supabase, COMPANY_ID)));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Subcontractors MCP Server running on stdio');
}

main().catch(console.error);

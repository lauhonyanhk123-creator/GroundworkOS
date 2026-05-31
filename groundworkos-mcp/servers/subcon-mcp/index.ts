import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { supabase } from '../../shared/db.js';
import { createSubcontractor, verifyCISStatus, listSubcontractors, getSubcontractorDetails, flagCISIssues } from './tools.js';
import 'dotenv/config';

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
}, async (args) => wrap(() => createSubcontractor(args, supabase, 'default')));

server.tool('verify_cis_status', 'Verify a subcontractor\'s CIS status with HMRC', {
  subcontractor_id: z.string(),
  utr_number: z.string(),
}, async (args) => wrap(() => verifyCISStatus(args, supabase)));

server.tool('list_subcontractors', 'List all subcontractors with document counts', {},
  async () => wrap(() => listSubcontractors(supabase, null)));

server.tool('get_subcontractor_details', 'Get full details for a subcontractor including all documents and payment history', { subcontractor_id: z.string() },
  async (args) => wrap(() => getSubcontractorDetails(args, supabase)));

server.tool('flag_cis_issues', 'Find all subcontractors with unverified or expired CIS documents', {},
  async () => wrap(() => flagCISIssues(supabase, null)));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Subcontractors MCP Server running on stdio');
}

main().catch(console.error);

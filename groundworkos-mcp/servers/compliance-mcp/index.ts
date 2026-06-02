import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { supabase } from '../../shared/db.js';
import { addDocument, checkComplianceStatus, flagExpiringDocuments, getJobDocuments, getSubcontractorDocuments } from './tools.js';
import 'dotenv/config';

// This stdio server has no authenticated user, so the company scope must be
// provided explicitly. Refuse to start without it rather than defaulting to a
// value that would read across tenants (the DB client bypasses RLS).
const COMPANY_ID = process.env.GROUNDWORKOS_COMPANY_ID;
if (!COMPANY_ID) {
  throw new Error('GROUNDWORKOS_COMPANY_ID must be set to run this MCP server directly.');
}

const server = new McpServer({ name: 'groundworkos-compliance', version: '1.0.0' });

function wrap(fn: () => Promise<unknown>) {
  return fn().then(data => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }))
    .catch((err: Error) => ({ content: [{ type: 'text' as const, text: JSON.stringify({ error: err.message }) }], isError: true as const }));
}

server.tool('add_document', 'Add a new document to the system', {
  name: z.string(),
  type: z.enum(['insurance', 'rams', 'permit', 'cscs', 'other']),
  related_to: z.enum(['job', 'subcontractor', 'company']).optional(),
  related_id: z.string().optional(),
  file_path: z.string().optional(),
  expiry_date: z.string().optional(),
  notes: z.string().optional(),
}, async (args) => wrap(() => addDocument(args, supabase, COMPANY_ID)));

server.tool('check_compliance_status', 'Full compliance health check - find expired and expiring documents', {},
  async () => wrap(() => checkComplianceStatus(supabase, COMPANY_ID)));

server.tool('flag_expiring_documents', 'Get documents expiring within specified days', { days_ahead: z.number().optional().default(30) },
  async (args) => wrap(() => flagExpiringDocuments(args, supabase, COMPANY_ID)));

server.tool('get_job_documents', 'Get all documents for a specific job', { job_id: z.string() },
  async (args) => wrap(() => getJobDocuments(args, supabase, COMPANY_ID)));

server.tool('get_subcontractor_documents', 'Get all documents for a specific subcontractor including CIS and insurance', { subcontractor_id: z.string() },
  async (args) => wrap(() => getSubcontractorDocuments(args, supabase, COMPANY_ID)));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Compliance MCP Server running on stdio');
}

main().catch(console.error);

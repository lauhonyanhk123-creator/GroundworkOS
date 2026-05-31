import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { supabase } from '../../shared/db.js';
import { addDocument, checkComplianceStatus, flagExpiringDocuments, getJobDocuments, getSubcontractorDocuments } from './tools.js';
import 'dotenv/config';

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
}, async (args) => wrap(() => addDocument(args, supabase, 'default')));

server.tool('check_compliance_status', 'Full compliance health check - find expired and expiring documents', {},
  async () => wrap(() => checkComplianceStatus(supabase, null)));

server.tool('flag_expiring_documents', 'Get documents expiring within specified days', { days_ahead: z.number().optional().default(30) },
  async (args) => wrap(() => flagExpiringDocuments(args, supabase, null)));

server.tool('get_job_documents', 'Get all documents for a specific job', { job_id: z.string() },
  async (args) => wrap(() => getJobDocuments(args, supabase)));

server.tool('get_subcontractor_documents', 'Get all documents for a specific subcontractor including CIS and insurance', { subcontractor_id: z.string() },
  async (args) => wrap(() => getSubcontractorDocuments(args, supabase)));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Compliance MCP Server running on stdio');
}

main().catch(console.error);

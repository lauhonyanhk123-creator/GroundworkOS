import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { supabase } from '../../shared/db.js';
import { createJob, updateJobStatus, updateJobProgress, getJobDetails, listJobs, getJobSummaryStats, getEntityHistory } from './tools.js';
import 'dotenv/config';

const server = new McpServer({ name: 'groundworkos-jobs', version: '1.0.0' });

function wrap(fn: () => Promise<unknown>) {
  return fn().then(data => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }))
    .catch((err: Error) => ({ content: [{ type: 'text' as const, text: JSON.stringify({ error: err.message }) }], isError: true as const }));
}

server.tool('create_job', 'Create a new job/project', {
  client_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  site_address: z.string().optional(),
  type: z.enum(['drainage', 'foundations', 'excavation', 'kerbing', 'sewers', 'reinstatement']).optional(),
  value: z.number().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
}, async (args) => wrap(() => createJob(args, supabase, 'default')));

server.tool('update_job_status', 'Update a job status', {
  job_id: z.string(),
  status: z.enum(['enquiry', 'quoted', 'active', 'on-hold', 'complete', 'cancelled']),
  notes: z.string().optional(),
}, async (args) => wrap(() => updateJobStatus(args, supabase, null)));

server.tool('update_job_progress', 'Update job progress percentage and log a site visit note', {
  job_id: z.string(),
  progress_percent: z.number().min(0).max(100),
  notes: z.string().optional(),
}, async (args) => wrap(() => updateJobProgress(args, supabase)));

server.tool('get_job_details', 'Get full details for a job including client, schedule entries, and documents', { job_id: z.string() },
  async (args) => wrap(() => getJobDetails(args, supabase)));

server.tool('list_jobs', 'List jobs with optional filters', {
  status: z.enum(['enquiry', 'quoted', 'active', 'on-hold', 'complete', 'cancelled']).optional(),
  client_id: z.string().optional(),
  limit: z.number().optional().default(20),
}, async (args) => wrap(() => listJobs(args, supabase, null)));

server.tool('get_job_summary_stats', 'Get dashboard stats for all jobs', {},
  async () => wrap(() => getJobSummaryStats(supabase, null)));

server.tool('get_entity_history', 'Retrieve the full status change history for a job, quote, or invoice.', {
  entity_type: z.enum(['job', 'quote', 'invoice']),
  entity_id: z.string(),
}, async (args) => wrap(() => getEntityHistory(args, supabase)));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Jobs MCP Server running on stdio');
}

main().catch(console.error);

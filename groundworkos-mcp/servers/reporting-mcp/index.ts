import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { supabase } from '../../shared/db.js';
import {
  getPipelineSummary,
  getRevenueReport,
  getProfitabilityReport,
  getDailyBriefing,
  getOverdueSummary,
  getAgedDebtorReport,
  getCISMonthlyReturn,
  getSubcontractorPaymentSchedule,
} from './tools.js';
import 'dotenv/config';

// This stdio server has no authenticated user, so the company scope must be
// provided explicitly. Refuse to start without it rather than defaulting to a
// value that would read across tenants (the DB client bypasses RLS).
const COMPANY_ID = process.env.GROUNDWORKOS_COMPANY_ID;
if (!COMPANY_ID) {
  throw new Error('GROUNDWORKOS_COMPANY_ID must be set to run this MCP server directly.');
}

const server = new McpServer({ name: 'groundworkos-reporting', version: '1.0.0' });

function wrap(fn: () => Promise<unknown>) {
  return fn().then(data => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }))
    .catch((err: Error) => ({ content: [{ type: 'text' as const, text: JSON.stringify({ error: err.message }) }], isError: true as const }));
}

server.tool('get_pipeline_summary', 'Get full pipeline summary for dashboard', {},
  async () => wrap(() => getPipelineSummary(supabase, COMPANY_ID)));

server.tool('get_revenue_report', 'Get revenue report grouped by month', { months_back: z.number().optional().default(6) },
  async (args) => wrap(() => getRevenueReport(args, supabase, COMPANY_ID)));

server.tool('get_profitability_report', 'Get profitability report comparing quotes vs invoices', { job_id: z.string().optional() },
  async (args) => wrap(() => getProfitabilityReport(args, supabase, COMPANY_ID)));

server.tool('get_daily_briefing', 'AI-ready summary of today\'s key information', {},
  async () => wrap(() => getDailyBriefing(supabase, COMPANY_ID)));

server.tool('get_overdue_summary', 'Get all overdue items across the system', {},
  async () => wrap(() => getOverdueSummary(supabase, COMPANY_ID)));

server.tool('get_aged_debtor_report', 'Get an aged debtor report showing outstanding invoices grouped by age buckets', {},
  async () => wrap(() => getAgedDebtorReport(supabase, COMPANY_ID)));

server.tool('get_cis_monthly_return', 'Get a CIS monthly return for a given month and year', {
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
}, async (args) => wrap(() => getCISMonthlyReturn(args, supabase, COMPANY_ID)));

server.tool('get_subcontractor_payment_schedule', 'Get a payment schedule for one or all subcontractors', {
  subcontractor_id: z.string().optional(),
  tax_year: z.string().optional(),
}, async (args) => wrap(() => getSubcontractorPaymentSchedule(args, supabase, COMPANY_ID)));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Reporting MCP Server running on stdio');
}

main().catch(console.error);

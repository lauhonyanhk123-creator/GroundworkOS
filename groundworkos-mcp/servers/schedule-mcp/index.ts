import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { supabase } from '../../shared/db.js';
import { createScheduleEntry, updateScheduleEntry, deleteScheduleEntry, getWeeklySchedule, checkAvailability, getWeatherRisk, getScheduleOverview } from './tools.js';
import 'dotenv/config';

// This stdio server has no authenticated user, so the company scope must be
// provided explicitly. Refuse to start without it rather than defaulting to a
// value that would read across tenants (the DB client bypasses RLS).
const COMPANY_ID = process.env.GROUNDWORKOS_COMPANY_ID;
if (!COMPANY_ID) {
  throw new Error('GROUNDWORKOS_COMPANY_ID must be set to run this MCP server directly.');
}

const server = new McpServer({ name: 'groundworkos-schedule', version: '1.0.0' });

function wrap(fn: () => Promise<unknown>) {
  return fn().then(data => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }))
    .catch((err: Error) => ({ content: [{ type: 'text' as const, text: JSON.stringify({ error: err.message }) }], isError: true as const }));
}

server.tool('create_schedule_entry', 'Create a new schedule entry', {
  job_id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  start_datetime: z.string(),
  end_datetime: z.string(),
  crew_count: z.number().optional().default(1),
  plant_assigned: z.string().optional(),
  notes: z.string().optional(),
}, async (args) => wrap(() => createScheduleEntry(args, supabase, COMPANY_ID)));

server.tool('update_schedule_entry', 'Edit an existing schedule entry (title, times, crew count, plant, linked job, notes).', {
  entry_id: z.string(),
  job_id: z.string().nullable().optional(),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  start_datetime: z.string().optional(),
  end_datetime: z.string().optional(),
  crew_count: z.number().optional(),
  plant_assigned: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
}, async (args) => wrap(() => updateScheduleEntry(args, supabase, COMPANY_ID)));

server.tool('delete_schedule_entry', 'Delete a schedule entry, for example a cancelled or duplicated booking.', { entry_id: z.string() },
  async (args) => wrap(() => deleteScheduleEntry(args, supabase, COMPANY_ID)));

server.tool('get_weekly_schedule', 'Get schedule for a week starting on Monday', { week_start_date: z.string() },
  async (args) => wrap(() => getWeeklySchedule(args, supabase, COMPANY_ID)));

server.tool('check_availability', 'Check if a date is available for scheduling', {
  date: z.string(),
  plant_name: z.string().optional(),
}, async (args) => wrap(() => checkAvailability(args, supabase, COMPANY_ID)));

server.tool('get_weather_risk', 'Get weather forecast and risk level for scheduling', {
  date: z.string(),
  postcode: z.string().optional(),
}, async (args) => wrap(() => getWeatherRisk(args)));

server.tool('get_schedule_overview', 'Get all schedule entries for a month with date grouping', {
  month: z.number().optional(),
  year: z.number().optional(),
}, async (args) => wrap(() => getScheduleOverview(args, supabase, COMPANY_ID)));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Schedule MCP Server running on stdio');
}

main().catch(console.error);

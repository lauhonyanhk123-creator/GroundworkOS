import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { supabase } from '../../shared/db.js';
import 'dotenv/config';

const server = new McpServer({
  name: 'groundworkos-schedule',
  version: '1.0.0',
});

server.tool(
  'create_schedule_entry',
  'Create a new schedule entry',
  {
    job_id: z.string().optional(),
    title: z.string(),
    description: z.string().optional(),
    start_datetime: z.string(),
    end_datetime: z.string(),
    crew_count: z.number().optional().default(1),
    plant_assigned: z.string().optional(),
    notes: z.string().optional(),
  },
  async (args) => {
    const { data: client } = await supabase
      .from('clients')
      .select('company_id')
      .limit(1)
      .single();

    const { data, error } = await supabase
      .from('schedule_entries')
      .insert({
        job_id: args.job_id ?? null,
        title: args.title,
        description: args.description ?? null,
        start_datetime: args.start_datetime,
        end_datetime: args.end_datetime,
        crew_count: args.crew_count ?? 1,
        plant_assigned: args.plant_assigned ?? null,
        notes: args.notes ?? null,
        company_id: client?.company_id || 'default',
      })
      .select(`
        *,
        jobs:job_id (id, job_number, title, client_id, clients:client_id (id, company_name))
      `)
      .single();

    if (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.tool(
  'get_weekly_schedule',
  'Get schedule for a week starting on Monday',
  {
    week_start_date: z.string(),
  },
  async (args) => {
    const startDate = new Date(args.week_start_date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const { data, error } = await supabase
      .from('schedule_entries')
      .select(`
        *,
        jobs:job_id (id, job_number, title, client_id, clients:client_id (id, company_name))
      `)
      .gte('start_datetime', startDate.toISOString())
      .lt('start_datetime', endDate.toISOString())
      .order('start_datetime', { ascending: true });

    if (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
        isError: true,
      };
    }

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const schedule: Record<string, unknown[]> = {};

    days.forEach(day => { schedule[day] = []; });

    (data || []).forEach((entry: Record<string, unknown>) => {
      const entryDate = new Date(entry.start_datetime as string);
      const dayIndex = entryDate.getDay();
      const dayName = days[dayIndex === 0 ? 6 : dayIndex - 1];
      (schedule[dayName] as unknown[]).push(entry);
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          week_start: args.week_start_date,
          schedule,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'check_availability',
  'Check if a date is available for scheduling',
  {
    date: z.string(),
    plant_name: z.string().optional(),
  },
  async (args) => {
    const startOfDay = new Date(args.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(args.date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: conflicts, error } = await supabase
      .from('schedule_entries')
      .select(`
        *,
        jobs:job_id (id, job_number, title)
      `)
      .gte('start_datetime', startOfDay.toISOString())
      .lte('start_datetime', endOfDay.toISOString())
      .order('start_datetime', { ascending: true });

    if (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
        isError: true,
      };
    }

    let plantConflicts: Record<string, unknown>[] = [];
    if (args.plant_name) {
      plantConflicts = (conflicts || []).filter((entry: Record<string, unknown>) =>
        entry.plant_assigned === args.plant_name
      );
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          date: args.date,
          is_available: (conflicts || []).length === 0 && plantConflicts.length === 0,
          total_conflicts: (conflicts || []).length,
          plant_conflicts: plantConflicts.length,
          conflicts: conflicts || [],
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'get_weather_risk',
  'Get weather forecast and risk level for scheduling',
  {
    date: z.string(),
    postcode: z.string().optional(),
  },
  async (args) => {
    let temperature = 15;
    let windSpeed = 10;
    let precipitation = 0;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let description = 'Clear conditions expected';
    let isMock = true;

    try {
      const postcode = args.postcode || 'SW1A 1AA';
      const apiKey = process.env.MET_OFFICE_API_KEY;

      if (apiKey) {
        const response = await fetch(
          `https://data.hub.api.metoffice.gov.uk/sitespecific/v0/point/daily?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: postcode,
              forecastPeriod: 1,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json() as {
            sites?: Array<{
              periods?: Array<{
                elements?: Array<{ type: string; value?: string }>
              }>
            }>
          };
          isMock = false;

          if (data.sites && data.sites[0]?.periods?.[0]?.elements) {
            const elements = data.sites[0].periods[0].elements;
            elements.forEach((el: { type: string; value?: string }) => {
              if (el.type === 'temperature') temperature = parseFloat(el.value || '15');
              if (el.type === 'windSpeed') windSpeed = parseFloat(el.value || '10');
              if (el.type === 'precipitation') precipitation = parseFloat(el.value || '0');
            });
          }
        }
      }
    } catch {
      isMock = true;
    }

    if (isMock) {
      const rand = Math.random();
      if (rand > 0.8) {
        temperature = 5 + Math.floor(Math.random() * 10);
        precipitation = Math.floor(Math.random() * 80);
        windSpeed = 15 + Math.floor(Math.random() * 30);
      } else if (rand > 0.5) {
        temperature = 10 + Math.floor(Math.random() * 10);
        precipitation = Math.floor(Math.random() * 30);
        windSpeed = 10 + Math.floor(Math.random() * 15);
      } else {
        temperature = 15 + Math.floor(Math.random() * 10);
        precipitation = Math.floor(Math.random() * 10);
        windSpeed = 5 + Math.floor(Math.random() * 10);
      }
    }

    if (precipitation > 50 || windSpeed > 40) {
      riskLevel = 'high';
      description = precipitation > 50
        ? 'Heavy rain expected - consider postponing'
        : 'High winds expected - secure equipment';
    } else if (precipitation > 20 || windSpeed > 25) {
      riskLevel = 'medium';
      description = precipitation > 20
        ? 'Rain expected - plan for wet conditions'
        : 'Moderate winds - monitor conditions';
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          date: args.date,
          temperature,
          wind_speed: windSpeed,
          precipitation,
          risk_level: riskLevel,
          description,
          is_mock: isMock,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'get_schedule_overview',
  'Get all schedule entries for a month with date grouping',
  {
    month: z.number().optional(),
    year: z.number().optional(),
  },
  async (args) => {
    const now = new Date();
    const month = args.month ?? now.getMonth() + 1;
    const year = args.year ?? now.getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const { data, error } = await supabase
      .from('schedule_entries')
      .select(`
        *,
        jobs:job_id (id, job_number, title, client_id, clients:client_id (id, company_name))
      `)
      .gte('start_datetime', startDate.toISOString())
      .lte('start_datetime', endDate.toISOString())
      .order('start_datetime', { ascending: true });

    if (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
        isError: true,
      };
    }

    const byDate: Record<string, unknown> = {};
    (data || []).forEach((entry: Record<string, unknown>) => {
      const dateKey = (entry.start_datetime as string).split('T')[0];
      if (!byDate[dateKey]) {
        byDate[dateKey] = [];
      }
      (byDate[dateKey] as unknown[]).push(entry);
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          month,
          year,
          entries_by_date: byDate,
          total_entries: (data || []).length,
        }, null, 2),
      }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Schedule MCP Server running on stdio');
}

main().catch(console.error);

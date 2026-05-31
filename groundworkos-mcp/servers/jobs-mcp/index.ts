import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { supabase } from '../../shared/db.js';
import { generateJobNumber } from '../../shared/utils.js';
import 'dotenv/config';

const server = new McpServer({
  name: 'groundworkos-jobs',
  version: '1.0.0',
});

server.tool(
  'create_job',
  'Create a new job/project',
  {
    client_id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    site_address: z.string().optional(),
    type: z.enum(['drainage', 'foundations', 'excavation', 'kerbing', 'sewers', 'reinstatement']).optional(),
    value: z.number().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  },
  async (args) => {
    const jobNumber = await generateJobNumber();

    const { data: client } = await supabase
      .from('clients')
      .select('company_id')
      .eq('id', args.client_id)
      .single();

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        job_number: jobNumber,
        client_id: args.client_id,
        title: args.title,
        description: args.description ?? null,
        site_address: args.site_address ?? null,
        type: args.type ?? null,
        value: args.value ?? null,
        start_date: args.start_date ?? null,
        end_date: args.end_date ?? null,
        status: 'enquiry',
        company_id: client?.company_id || 'default',
      })
      .select()
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
  'update_job_status',
  'Update a job status',
  {
    job_id: z.string(),
    status: z.enum(['enquiry', 'quoted', 'active', 'on-hold', 'complete', 'cancelled']),
    notes: z.string().optional(),
  },
  async (args) => {
    const { data: existing } = await supabase
      .from('jobs')
      .select('notes')
      .eq('id', args.job_id)
      .single();

    let updatedNotes = existing?.notes || '';
    if (args.notes) {
      const timestamp = new Date().toISOString();
      updatedNotes += `\n[${timestamp}] Status changed to ${args.status}: ${args.notes}`;
    }

    const { data, error } = await supabase
      .from('jobs')
      .update({
        status: args.status,
        notes: updatedNotes.trim() || null,
      })
      .eq('id', args.job_id)
      .select()
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
  'update_job_progress',
  'Update job progress percentage and log a site visit note',
  {
    job_id: z.string(),
    progress_percent: z.number().min(0).max(100),
    notes: z.string().optional(),
  },
  async (args) => {
    const { data: existing } = await supabase
      .from('jobs')
      .select('notes')
      .eq('id', args.job_id)
      .single();

    let updatedNotes = existing?.notes || '';
    if (args.notes) {
      const timestamp = new Date().toISOString();
      updatedNotes += `\n[${timestamp}] Progress: ${args.progress_percent}% - ${args.notes}`;
    }

    const { data, error } = await supabase
      .from('jobs')
      .update({
        progress_percent: Math.max(0, Math.min(100, args.progress_percent)),
        notes: updatedNotes.trim() || null,
      })
      .eq('id', args.job_id)
      .select()
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
  'get_job_details',
  'Get full details for a job including client, schedule entries, and documents',
  {
    job_id: z.string(),
  },
  async (args) => {
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', args.job_id)
      .single();

    if (jobError) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: jobError.message }) }],
        isError: true,
      };
    }

    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', job.client_id)
      .single();

    const { data: schedule } = await supabase
      .from('schedule_entries')
      .select('*')
      .eq('job_id', args.job_id)
      .order('start_datetime', { ascending: true });

    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .eq('related_to', 'job')
      .eq('related_id', args.job_id);

    const { data: statusHistory } = await supabase
      .from('status_history')
      .select('*')
      .eq('entity_type', 'job')
      .eq('entity_id', args.job_id)
      .order('created_at', { ascending: false });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            { job, client, schedule: schedule || [], documents: documents || [], status_history: statusHistory || [] },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  'list_jobs',
  'List jobs with optional filters',
  {
    status: z.enum(['enquiry', 'quoted', 'active', 'on-hold', 'complete', 'cancelled']).optional(),
    client_id: z.string().optional(),
    limit: z.number().optional().default(20),
  },
  async (args) => {
    const limit = args.limit ?? 20;

    let query = supabase
      .from('jobs')
      .select(`
        *,
        clients:client_id (id, company_name, contact_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (args.status) {
      query = query.eq('status', args.status);
    }

    if (args.client_id) {
      query = query.eq('client_id', args.client_id);
    }

    const { data, error } = await query;

    if (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(data || [], null, 2) }],
    };
  }
);

server.tool(
  'get_job_summary_stats',
  'Get dashboard stats for all jobs',
  {},
  async () => {
    const { data: jobs, error } = await supabase.from('jobs').select('status, value');

    if (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
        isError: true,
      };
    }

    const activeCount = jobs?.filter((j: { status: string }) => j.status === 'active').length || 0;
    const quotedCount = jobs?.filter((j: { status: string }) => j.status === 'quoted').length || 0;
    const completeCount = jobs?.filter((j: { status: string }) => j.status === 'complete').length || 0;
    const totalPipelineValue = jobs?.reduce((sum: number, j: { value: number }) => sum + (j.value || 0), 0) || 0;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              active_count: activeCount,
              quoted_count: quotedCount,
              complete_count: completeCount,
              total_pipeline_value: totalPipelineValue,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  'get_entity_history',
  'Retrieve the full status change history for a job, quote, or invoice. Use when the user asks about status changes, audit trail, or history for a specific entity.',
  {
    entity_type: z.enum(['job', 'quote', 'invoice']),
    entity_id: z.string(),
  },
  async (args) => {
    try {
      const { data, error } = await supabase
        .from('status_history')
        .select('*')
        .eq('entity_type', args.entity_type)
        .eq('entity_id', args.entity_id)
        .order('created_at', { ascending: false });

      if (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
          isError: true,
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(data ?? [], null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to retrieve entity history.' }) }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Jobs MCP Server running on stdio');
}

main().catch(console.error);

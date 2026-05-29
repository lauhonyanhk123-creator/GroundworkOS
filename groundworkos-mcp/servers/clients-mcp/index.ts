import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { supabase } from '../../shared/db.js';
import 'dotenv/config';

const server = new McpServer({
  name: 'groundworkos-clients',
  version: '1.0.0',
});

server.tool(
  'create_client',
  'Create a new client in the CRM',
  {
    company_name: z.string(),
    contact_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    companies_house_number: z.string().optional(),
    notes: z.string().optional(),
  },
  async (args) => {
    const { company_name, contact_name, email, phone, address, companies_house_number, notes } = args;

    const { data, error } = await supabase
      .from('clients')
      .insert({
        company_name,
        contact_name: contact_name ?? null,
        email: email ?? null,
        phone: phone ?? null,
        address: address ?? null,
        companies_house_number: companies_house_number ?? null,
        notes: notes ?? null,
        company_id: 'default',
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
  'get_client',
  'Get a single client by ID with their stats',
  {
    client_id: z.string(),
  },
  async (args) => {
    const { client_id } = args;

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single();

    if (clientError) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: clientError.message }) }],
        isError: true,
      };
    }

    const { count: jobCount } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', client_id);

    const { data: invoices } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('client_id', client_id)
      .eq('status', 'paid');

    const totalInvoiced = invoices?.reduce((sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0), 0) || 0;

    const result = {
      ...client,
      job_count: jobCount || 0,
      total_invoiced: totalInvoiced,
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  'search_clients',
  'Search clients by company name or contact name',
  {
    query: z.string(),
  },
  async (args) => {
    const { query } = args;

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .or(`company_name.ilike.%${query}%,contact_name.ilike.%${query}%`)
      .limit(10);

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
  'get_client_history',
  'Get full history for a client including jobs, quotes, and invoices',
  {
    client_id: z.string(),
  },
  async (args) => {
    const { client_id } = args;

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single();

    if (clientError) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: clientError.message }) }],
        isError: true,
      };
    }

    const { data: jobs } = await supabase
      .from('jobs')
      .select('*')
      .eq('client_id', client_id)
      .order('created_at', { ascending: false });

    const { data: quotes } = await supabase
      .from('quotes')
      .select('*')
      .eq('client_id', client_id)
      .order('created_at', { ascending: false });

    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', client_id)
      .order('created_at', { ascending: false });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ client, jobs: jobs || [], quotes: quotes || [], invoices: invoices || [] }, null, 2),
        },
      ],
    };
  }
);

server.tool(
  'update_client',
  'Update client details',
  {
    client_id: z.string(),
    company_name: z.string().optional(),
    contact_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    companies_house_number: z.string().optional(),
    notes: z.string().optional(),
  },
  async (args) => {
    const { client_id, ...updates } = args;
    const cleanUpdates: Record<string, string | null> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    const { data, error } = await supabase
      .from('clients')
      .update(cleanUpdates)
      .eq('id', client_id)
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Clients MCP Server running on stdio');
}

main().catch(console.error);

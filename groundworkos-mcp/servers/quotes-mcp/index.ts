import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { supabase } from '../../shared/db.js';
import { generateQuoteNumber, generateJobNumber, calculateLineItemTotals } from '../../shared/utils.js';
import 'dotenv/config';

const server = new McpServer({
  name: 'groundworkos-quotes',
  version: '1.0.0',
});

server.tool(
  'create_quote',
  'Create a new quote for a client',
  {
    client_id: z.string(),
    title: z.string(),
    line_items: z.array(z.object({
      description: z.string(),
      quantity: z.number(),
      unit_price: z.number(),
    })),
    notes: z.string().optional(),
    job_id: z.string().optional(),
  },
  async (args) => {
    const quoteNumber = await generateQuoteNumber();

    const { data: client } = await supabase
      .from('clients')
      .select('company_id')
      .eq('id', args.client_id)
      .single();

    const lineItemsWithTotals = args.line_items.map((item) => ({
      ...item,
      total: item.quantity * item.unit_price,
    }));

    const totals = calculateLineItemTotals(args.line_items);

    const { data, error } = await supabase
      .from('quotes')
      .insert({
        quote_number: quoteNumber,
        client_id: args.client_id,
        job_id: args.job_id ?? null,
        title: args.title,
        line_items: lineItemsWithTotals,
        subtotal: totals.subtotal,
        vat_amount: totals.vat_amount,
        total_amount: totals.total_amount,
        status: 'draft',
        notes: args.notes ?? null,
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
  'update_quote',
  'Update quote line items or notes and recalculate totals',
  {
    quote_id: z.string(),
    line_items: z.array(z.object({
      description: z.string(),
      quantity: z.number(),
      unit_price: z.number(),
    })).optional(),
    notes: z.string().optional(),
  },
  async (args) => {
    const updates: Record<string, unknown> = {};

    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }

    if (args.line_items) {
      const lineItemsWithTotals = args.line_items.map((item) => ({
        ...item,
        total: item.quantity * item.unit_price,
      }));
      updates.line_items = lineItemsWithTotals;

      const totals = calculateLineItemTotals(args.line_items);
      updates.subtotal = totals.subtotal;
      updates.vat_amount = totals.vat_amount;
      updates.total_amount = totals.total_amount;
    }

    const { data, error } = await supabase
      .from('quotes')
      .update(updates)
      .eq('id', args.quote_id)
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
  'send_quote',
  'Mark a quote as sent to the client',
  {
    quote_id: z.string(),
  },
  async (args) => {
    const { data, error } = await supabase
      .from('quotes')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', args.quote_id)
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
  'accept_quote',
  'Mark a quote as accepted by the client',
  {
    quote_id: z.string(),
  },
  async (args) => {
    const { data, error } = await supabase
      .from('quotes')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', args.quote_id)
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
  'convert_quote_to_job',
  'Convert an accepted quote into an active job',
  {
    quote_id: z.string(),
  },
  async (args) => {
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', args.quote_id)
      .single();

    if (quoteError) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: quoteError.message }) }],
        isError: true,
      };
    }

    if (quote.status !== 'accepted') {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Quote must be accepted before converting to a job' }) }],
        isError: true,
      };
    }

    const jobNumber = await generateJobNumber();

    const { data: newJob, error: jobError } = await supabase
      .from('jobs')
      .insert({
        job_number: jobNumber,
        client_id: quote.client_id,
        quote_id: quote.id,
        title: quote.title || 'New Job from Quote',
        description: `Created from quote ${quote.quote_number}`,
        value: quote.total_amount,
        status: 'active',
        company_id: quote.company_id,
      })
      .select()
      .single();

    if (jobError) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: jobError.message }) }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(newJob, null, 2) }],
    };
  }
);

server.tool(
  'list_quotes',
  'List all quotes with optional status filter',
  {
    status: z.enum(['draft', 'sent', 'accepted', 'rejected']).optional(),
  },
  async (args) => {
    let query = supabase
      .from('quotes')
      .select(`
        *,
        clients:client_id (id, company_name, contact_name)
      `)
      .order('created_at', { ascending: false });

    if (args.status) {
      query = query.eq('status', args.status);
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Quotes MCP Server running on stdio');
}

main().catch(console.error);

import { NextRequest, NextResponse } from 'next/server';
import { Mistral } from '@mistralai/mistralai';
import { tools } from '@/lib/mistral-tools';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

if (!process.env.MISTRAL_API_KEY) {
  throw new Error('MISTRAL_API_KEY is not set');
}

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

interface ToolDefinition {
  type: 'function';
  function: { name: string; description?: string; parameters?: unknown };
}

type ToolArg = Record<string, unknown>;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { data: userCompany } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    const companyId: string | null = userCompany?.company_id ?? null;

    const { messages } = await request.json() as { messages: unknown[] };

    // First call: non-streaming to detect tool use
    const firstResponse = await mistral.chat.complete({
      model: 'mistral-small-latest',
      messages: messages as Parameters<typeof mistral.chat.complete>[0]['messages'],
      tools: tools as ToolDefinition[],
      toolChoice: 'auto',
    });

    const assistantMessage = firstResponse.choices?.[0]?.message;
    if (!assistantMessage) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    const encoder = new TextEncoder();

    // No tool calls — return content immediately as a single-chunk stream
    if (!assistantMessage.toolCalls?.length) {
      const content =
        typeof assistantMessage.content === 'string'
          ? assistantMessage.content
          : Array.isArray(assistantMessage.content)
          ? assistantMessage.content.map((c) => ('text' in c ? c.text : '')).join('')
          : '';

      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(content));
          controller.close();
        },
      });
      return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    // Execute tool calls in parallel
    const toolResults = await Promise.all(
      assistantMessage.toolCalls.map(async (tc) => {
        const args: ToolArg =
          typeof tc.function.arguments === 'string'
            ? (JSON.parse(tc.function.arguments) as ToolArg)
            : (tc.function.arguments as ToolArg);
        const result = await executeTool(tc.function.name, args, supabase, companyId);
        return {
          role: 'tool' as const,
          toolCallId: tc.id ?? '',
          name: tc.function.name,
          content: JSON.stringify(result),
        };
      })
    );

    // Second call: stream the final answer
    const finalMessages = [
      ...(messages as Parameters<typeof mistral.chat.stream>[0]['messages']),
      assistantMessage,
      ...toolResults,
    ] as Parameters<typeof mistral.chat.stream>[0]['messages'];

    const secondStream = await mistral.chat.stream({
      model: 'mistral-small-latest',
      messages: finalMessages,
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of secondStream) {
            const content = chunk.data.choices?.[0]?.delta?.content;
            if (content) controller.enqueue(encoder.encode(content));
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  } catch (error) {
    console.error('[AI route] Error:', error);
    return NextResponse.json({ error: 'Failed to process AI request' }, { status: 500 });
  }
}

async function executeTool(
  toolName: string,
  args: ToolArg,
  supabase: SupabaseClient,
  companyId: string | null
): Promise<unknown> {
  try {
    switch (toolName) {
      case 'create_client': return await createClientTool(args, supabase, companyId);
      case 'get_client': return await getClientTool(args, supabase);
      case 'search_clients': return await searchClientsTool(args, supabase, companyId);
      case 'get_client_history': return await getClientHistoryTool(args, supabase);
      case 'update_client': return await updateClientTool(args, supabase);
      case 'list_jobs': return await listJobsTool(args, supabase, companyId);
      case 'get_job_details': return await getJobDetailsTool(args, supabase);
      case 'get_job_summary_stats': return await getJobSummaryStatsTool(supabase, companyId);
      case 'get_pipeline_summary': return await getPipelineSummaryTool(supabase, companyId);
      case 'get_daily_briefing': return await getDailyBriefingTool(supabase, companyId);
      case 'get_outstanding_invoices': return await getOutstandingInvoicesTool(supabase, companyId);
      default: return { error: `Tool ${toolName} not implemented yet` };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function createClientTool(args: ToolArg, supabase: SupabaseClient, companyId: string | null) {
  if (!companyId) return { error: 'No company associated with this account' };
  const { data, error } = await supabase
    .from('clients')
    .insert({
      company_name: args.company_name,
      contact_name: args.contact_name ?? null,
      email: args.email ?? null,
      phone: args.phone ?? null,
      address: args.address ?? null,
      companies_house_number: args.companies_house_number ?? null,
      notes: args.notes ?? null,
      company_id: companyId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function getClientTool(args: ToolArg, supabase: SupabaseClient) {
  const clientId = args.client_id as string;
  const { data: client, error: clientError } = await supabase
    .from('clients').select('*').eq('id', clientId).single();
  if (clientError) throw new Error(clientError.message);

  const { count: jobCount } = await supabase
    .from('jobs').select('*', { count: 'exact', head: true }).eq('client_id', clientId);

  const { data: invoices } = await supabase
    .from('invoices').select('total_amount').eq('client_id', clientId).eq('status', 'paid');

  const totalInvoiced = (invoices ?? []).reduce(
    (sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0), 0
  );
  return { ...client, job_count: jobCount ?? 0, total_invoiced: totalInvoiced };
}

async function searchClientsTool(args: ToolArg, supabase: SupabaseClient, companyId: string | null) {
  let query = supabase
    .from('clients').select('*')
    .or(`company_name.ilike.%${args.query}%,contact_name.ilike.%${args.query}%`)
    .limit(10);
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function getClientHistoryTool(args: ToolArg, supabase: SupabaseClient) {
  const clientId = args.client_id as string;
  const { data: client, error: clientError } = await supabase
    .from('clients').select('*').eq('id', clientId).single();
  if (clientError) throw new Error(clientError.message);

  const [{ data: jobs }, { data: quotes }, { data: invoices }] = await Promise.all([
    supabase.from('jobs').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    supabase.from('quotes').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    supabase.from('invoices').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
  ]);
  return { client, jobs: jobs ?? [], quotes: quotes ?? [], invoices: invoices ?? [] };
}

async function updateClientTool(args: ToolArg, supabase: SupabaseClient) {
  const { client_id, ...updates } = args;
  const cleanUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) cleanUpdates[key] = value;
  }
  const { data, error } = await supabase
    .from('clients').update(cleanUpdates).eq('id', client_id as string).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function listJobsTool(args: ToolArg, supabase: SupabaseClient, companyId: string | null) {
  let query = supabase.from('jobs').select('*');
  if (companyId) query = query.eq('company_id', companyId);
  if (args.status) query = query.eq('status', args.status as string);
  if (args.client_id) query = query.eq('client_id', args.client_id as string);
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit((args.limit as number) ?? 20);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function getJobDetailsTool(args: ToolArg, supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('jobs').select('*').eq('id', args.job_id as string).single();
  if (error) throw new Error(error.message);
  return data;
}

async function getJobSummaryStatsTool(supabase: SupabaseClient, companyId: string | null) {
  let totalQ = supabase.from('jobs').select('*', { count: 'exact', head: true });
  let activeQ = supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'active');
  let completeQ = supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'complete');
  if (companyId) {
    totalQ = totalQ.eq('company_id', companyId);
    activeQ = activeQ.eq('company_id', companyId);
    completeQ = completeQ.eq('company_id', companyId);
  }
  const [totalResult, activeResult, completeResult] = await Promise.all([totalQ, activeQ, completeQ]);
  return {
    total_jobs: totalResult.count ?? 0,
    active_jobs: activeResult.count ?? 0,
    completed_jobs: completeResult.count ?? 0,
  };
}

async function getPipelineSummaryTool(supabase: SupabaseClient, companyId: string | null) {
  let quotesQ = supabase.from('quotes').select('*', { count: 'exact', head: true });
  let jobsQ = supabase.from('jobs').select('*', { count: 'exact', head: true });
  let invoicesQ = supabase.from('invoices').select('total_amount, status');
  if (companyId) {
    quotesQ = quotesQ.eq('company_id', companyId);
    jobsQ = jobsQ.eq('company_id', companyId);
    invoicesQ = invoicesQ.eq('company_id', companyId);
  }
  const [quotesResult, jobsResult, invoicesResult] = await Promise.all([quotesQ, jobsQ, invoicesQ]);
  const totalRevenue = (invoicesResult.data ?? []).reduce(
    (sum: number, inv: { total_amount: number; status: string }) =>
      inv.status === 'paid' ? sum + (inv.total_amount || 0) : sum,
    0
  );
  return {
    total_quotes: quotesResult.count ?? 0,
    total_jobs: jobsResult.count ?? 0,
    total_revenue: totalRevenue,
  };
}

async function getDailyBriefingTool(supabase: SupabaseClient, companyId: string | null) {
  const today = new Date().toISOString().split('T')[0];
  const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  let activeJobsQ = supabase.from('jobs').select('*').eq('status', 'active');
  let overdueInvoicesQ = supabase.from('invoices').select('*').eq('status', 'overdue');
  let scheduleQ = supabase
    .from('schedule_entries')
    .select('*')
    .gte('start_datetime', today)
    .lte('start_datetime', weekAhead)
    .order('start_datetime', { ascending: true });

  if (companyId) {
    activeJobsQ = activeJobsQ.eq('company_id', companyId);
    overdueInvoicesQ = overdueInvoicesQ.eq('company_id', companyId);
    scheduleQ = scheduleQ.eq('company_id', companyId);
  }

  const [activeJobsResult, overdueInvoicesResult, scheduleResult] = await Promise.all([
    activeJobsQ,
    overdueInvoicesQ,
    scheduleQ,
  ]);

  return {
    date: today,
    active_jobs: activeJobsResult.data?.length ?? 0,
    overdue_invoices: overdueInvoicesResult.data?.length ?? 0,
    upcoming_schedule: scheduleResult.data?.length ?? 0,
    jobs: activeJobsResult.data ?? [],
    invoices: overdueInvoicesResult.data ?? [],
    schedule: scheduleResult.data ?? [],
  };
}

async function getOutstandingInvoicesTool(supabase: SupabaseClient, companyId: string | null) {
  let query = supabase
    .from('invoices')
    .select('*')
    .in('status', ['sent', 'overdue'])
    .order('due_date', { ascending: true });
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

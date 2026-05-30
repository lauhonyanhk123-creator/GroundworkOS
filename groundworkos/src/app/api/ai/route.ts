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

      // Jobs mutations
      case 'update_job_status': return await updateJobStatusTool(args, supabase, companyId);
      case 'update_job_progress': return await updateJobProgressTool(args, supabase);
      case 'create_job': return await createJobTool(args, supabase, companyId);

      // Quotes
      case 'create_quote': return await createQuoteTool(args, supabase, companyId);
      case 'update_quote': return await updateQuoteTool(args, supabase);
      case 'send_quote': return await sendQuoteTool(args, supabase);
      case 'accept_quote': return await acceptQuoteTool(args, supabase);
      case 'convert_quote_to_job': return await convertQuoteToJobTool(args, supabase);
      case 'list_quotes': return await listQuotesTool(args, supabase, companyId);

      // Invoices
      case 'create_invoice': return await createInvoiceTool(args, supabase, companyId);
      case 'mark_invoice_paid': return await markInvoicePaidTool(args, supabase);
      case 'send_invoice': return await sendInvoiceTool(args, supabase);
      case 'get_invoice_summary': return await getInvoiceSummaryTool(supabase, companyId);

      // Subcontractors
      case 'create_subcontractor': return await createSubcontractorTool(args, supabase, companyId);
      case 'list_subcontractors': return await listSubcontractorsTool(supabase, companyId);
      case 'get_subcontractor_details': return await getSubcontractorDetailsTool(args, supabase);
      case 'flag_cis_issues': return await flagCISIssuesTool(supabase, companyId);
      case 'verify_cis_status': return await verifyCISStatusTool(args, supabase);

      // Schedule
      case 'create_schedule_entry': return await createScheduleEntryTool(args, supabase, companyId);
      case 'get_weekly_schedule': return await getWeeklyScheduleTool(args, supabase, companyId);
      case 'check_availability': return await checkAvailabilityTool(args, supabase, companyId);
      case 'get_weather_risk': return await getWeatherRiskTool(args);
      case 'get_schedule_overview': return await getScheduleOverviewTool(args, supabase, companyId);

      // Compliance
      case 'add_document': return await addDocumentTool(args, supabase, companyId);
      case 'check_compliance_status': return await checkComplianceStatusTool(supabase, companyId);
      case 'flag_expiring_documents': return await flagExpiringDocumentsTool(args, supabase, companyId);
      case 'get_job_documents': return await getJobDocumentsTool(args, supabase);
      case 'get_subcontractor_documents': return await getSubcontractorDocumentsTool(args, supabase);

      // Reporting
      case 'get_revenue_report': return await getRevenueReportTool(args, supabase, companyId);
      case 'get_profitability_report': return await getProfitabilityReportTool(args, supabase, companyId);
      case 'get_overdue_summary': return await getOverdueSummaryTool(supabase, companyId);

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

// ─── Jobs mutations ──────────────────────────────────────────────────────────

async function updateJobStatusTool(args: ToolArg, supabase: SupabaseClient, companyId: string | null) {
  const jobId = args.job_id as string;
  const newStatus = args.status as string;
  const noteText = args.notes as string | undefined;

  const { data: existing, error: fetchError } = await supabase.from('jobs').select('*').eq('id', jobId).single();
  if (fetchError || !existing) throw new Error('Job not found.');

  const oldStatus = existing.status as string;
  const updatedNotes = noteText
    ? `${existing.notes ? existing.notes + '\n' : ''}[${new Date().toISOString().split('T')[0]}] ${noteText}`
    : existing.notes;

  const { error: updateError } = await supabase.from('jobs')
    .update({ status: newStatus, notes: updatedNotes })
    .eq('id', jobId);
  if (updateError) throw new Error(updateError.message);

  if (companyId) {
    await supabase.from('status_history').insert({
      company_id: companyId,
      entity_type: 'job',
      entity_id: jobId,
      old_status: oldStatus,
      new_status: newStatus,
      notes: noteText ?? null,
      created_by: null,
    });
  }

  return { job_id: jobId, old_status: oldStatus, new_status: newStatus };
}

async function updateJobProgressTool(args: ToolArg, supabase: SupabaseClient) {
  const jobId = args.job_id as string;
  const rawProgress = args.progress_percent as number;
  const clamped = Math.max(0, Math.min(100, Math.round(rawProgress)));
  const noteText = args.notes as string | undefined;

  const { data: existing, error: fetchError } = await supabase.from('jobs').select('notes').eq('id', jobId).single();
  if (fetchError) throw new Error('Job not found.');

  const updatedNotes = noteText
    ? `${existing.notes ? existing.notes + '\n' : ''}[${new Date().toISOString().split('T')[0]}] ${noteText}`
    : existing.notes;

  const { error } = await supabase.from('jobs')
    .update({ progress_percent: clamped, notes: updatedNotes })
    .eq('id', jobId);
  if (error) throw new Error(error.message);

  return { job_id: jobId, progress_percent: clamped };
}

async function createJobTool(args: ToolArg, supabase: SupabaseClient, companyId: string | null) {
  if (!companyId) return { error: 'No company associated with this account' };

  const { data: jobNumData, error: rpcError } = await supabase.rpc('generate_job_number');
  if (rpcError || !jobNumData) throw new Error('Failed to generate job number.');

  const { data, error } = await supabase.from('jobs').insert({
    company_id: companyId,
    job_number: jobNumData as string,
    client_id: (args.client_id as string) ?? null,
    title: args.title as string,
    description: (args.description as string) ?? null,
    site_address: (args.site_address as string) ?? null,
    status: (args.status as string) ?? 'enquiry',
    value: (args.value as number) ?? null,
    start_date: (args.start_date as string) ?? null,
    end_date: (args.end_date as string) ?? null,
    progress_percent: 0,
    notes: (args.notes as string) ?? null,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// ─── Quotes ──────────────────────────────────────────────────────────────────

async function createQuoteTool(args: ToolArg, supabase: SupabaseClient, companyId: string | null) {
  if (!companyId) return { error: 'No company associated with this account' };

  const { data: quoteNumData, error: rpcError } = await supabase.rpc('generate_quote_number');
  if (rpcError || !quoteNumData) throw new Error('Failed to generate quote number.');

  const lineItems = (args.line_items as Array<{ description: string; quantity: number; unit_price: number }>) ?? [];
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, (args.subtotal as number) ?? 0);
  const vatAmount = Math.round(subtotal * 0.2 * 100) / 100;
  const totalAmount = Math.round(subtotal * 1.2 * 100) / 100;

  const { data, error } = await supabase.from('quotes').insert({
    company_id: companyId,
    quote_number: quoteNumData as string,
    client_id: (args.client_id as string) ?? null,
    title: (args.title as string) ?? null,
    line_items: lineItems,
    subtotal,
    vat_amount: vatAmount,
    total_amount: totalAmount,
    status: 'draft',
    notes: (args.notes as string) ?? null,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function updateQuoteTool(args: ToolArg, supabase: SupabaseClient) {
  const { quote_id, ...rest } = args;
  const updates: Record<string, unknown> = {};

  if (rest.line_items !== undefined) {
    const lineItems = rest.line_items as Array<{ description: string; quantity: number; unit_price: number }>;
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    updates.line_items = lineItems;
    updates.subtotal = subtotal;
    updates.vat_amount = Math.round(subtotal * 0.2 * 100) / 100;
    updates.total_amount = Math.round(subtotal * 1.2 * 100) / 100;
  }
  if (rest.title !== undefined) updates.title = rest.title;
  if (rest.notes !== undefined) updates.notes = rest.notes;
  if (rest.status !== undefined) updates.status = rest.status;

  const { data, error } = await supabase.from('quotes').update(updates).eq('id', quote_id as string).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function sendQuoteTool(args: ToolArg, supabase: SupabaseClient) {
  const { error } = await supabase.from('quotes')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', args.quote_id as string);
  if (error) throw new Error(error.message);
  return { quote_id: args.quote_id, status: 'sent' };
}

async function acceptQuoteTool(args: ToolArg, supabase: SupabaseClient) {
  const { error } = await supabase.from('quotes')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', args.quote_id as string);
  if (error) throw new Error(error.message);
  return { quote_id: args.quote_id, status: 'accepted' };
}

async function convertQuoteToJobTool(args: ToolArg, supabase: SupabaseClient) {
  const quoteId = args.quote_id as string;

  const { data: quote, error: quoteError } = await supabase.from('quotes').select('*').eq('id', quoteId).single();
  if (quoteError || !quote) throw new Error('Quote not found.');
  if (quote.status !== 'accepted') throw new Error('Quote must be accepted before converting to a job.');

  const { data: jobNumData, error: rpcError } = await supabase.rpc('generate_job_number');
  if (rpcError || !jobNumData) throw new Error('Failed to generate job number.');

  const { data: jobData, error: jobError } = await supabase.from('jobs').insert({
    company_id: quote.company_id,
    job_number: jobNumData as string,
    client_id: quote.client_id,
    title: quote.title ?? quote.quote_number,
    value: quote.total_amount,
    status: 'active',
    progress_percent: 0,
  }).select().single();
  if (jobError || !jobData) throw new Error(jobError?.message ?? 'Failed to create job.');

  await supabase.from('quotes').update({ job_id: jobData.id }).eq('id', quoteId);
  return { job: jobData, quote_id: quoteId };
}

async function listQuotesTool(args: ToolArg, supabase: SupabaseClient, companyId: string | null) {
  let query = supabase.from('quotes')
    .select('*, client:clients(id, company_name)')
    .order('created_at', { ascending: false })
    .limit((args.limit as number) ?? 20);
  if (companyId) query = query.eq('company_id', companyId);
  if (args.status) query = query.eq('status', args.status as string);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

async function createInvoiceTool(args: ToolArg, supabase: SupabaseClient, companyId: string | null) {
  if (!companyId) return { error: 'No company associated with this account' };

  const { data: invNumData, error: rpcError } = await supabase.rpc('generate_invoice_number');
  if (rpcError || !invNumData) throw new Error('Failed to generate invoice number.');

  const subtotal = args.subtotal as number;
  const vatAmount = Math.round(subtotal * 0.2 * 100) / 100;
  const totalAmount = Math.round(subtotal * 1.2 * 100) / 100;

  const { data, error } = await supabase.from('invoices').insert({
    company_id: companyId,
    invoice_number: invNumData as string,
    client_id: (args.client_id as string) ?? null,
    job_id: (args.job_id as string) ?? null,
    quote_id: (args.quote_id as string) ?? null,
    subtotal,
    vat_amount: vatAmount,
    total_amount: totalAmount,
    status: 'draft',
    due_date: (args.due_date as string) ?? null,
    notes: (args.notes as string) ?? null,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function markInvoicePaidTool(args: ToolArg, supabase: SupabaseClient) {
  const { error } = await supabase.from('invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', args.invoice_id as string);
  if (error) throw new Error(error.message);
  return { invoice_id: args.invoice_id, status: 'paid' };
}

async function sendInvoiceTool(args: ToolArg, supabase: SupabaseClient) {
  const { error } = await supabase.from('invoices')
    .update({ status: 'sent' })
    .eq('id', args.invoice_id as string);
  if (error) throw new Error(error.message);
  return { invoice_id: args.invoice_id, status: 'sent' };
}

async function getInvoiceSummaryTool(supabase: SupabaseClient, companyId: string | null) {
  let paidQ = supabase.from('invoices').select('total_amount, created_at').eq('status', 'paid');
  let outstandingQ = supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'sent');
  let overdueQ = supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'overdue');
  if (companyId) {
    paidQ = paidQ.eq('company_id', companyId);
    outstandingQ = outstandingQ.eq('company_id', companyId);
    overdueQ = overdueQ.eq('company_id', companyId);
  }
  const [paidResult, outstandingResult, overdueResult] = await Promise.all([paidQ, outstandingQ, overdueQ]);

  const byMonth: Record<string, { month: string; total: number; count: number }> = {};
  for (const inv of paidResult.data ?? []) {
    const month = (inv.created_at as string).slice(0, 7);
    if (!byMonth[month]) byMonth[month] = { month, total: 0, count: 0 };
    byMonth[month].total += inv.total_amount as number;
    byMonth[month].count += 1;
  }

  return {
    monthly_breakdown: Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)),
    outstanding_count: outstandingResult.count ?? 0,
    overdue_count: overdueResult.count ?? 0,
  };
}

// ─── Subcontractors ───────────────────────────────────────────────────────────

async function createSubcontractorTool(args: ToolArg, supabase: SupabaseClient, companyId: string | null) {
  if (!companyId) return { error: 'No company associated with this account' };
  const { data, error } = await supabase.from('subcontractors').insert({
    company_id: companyId,
    company_name: args.company_name as string,
    contact_name: (args.contact_name as string) ?? null,
    trade: (args.trade as string) ?? null,
    utr_number: (args.utr_number as string) ?? null,
    email: (args.email as string) ?? null,
    phone: (args.phone as string) ?? null,
    notes: (args.notes as string) ?? null,
    cis_status: 'unverified',
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function listSubcontractorsTool(supabase: SupabaseClient, companyId: string | null) {
  let query = supabase.from('subcontractors').select('*').order('company_name');
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const subs = data ?? [];

  const subIds = subs.map(s => s.id as string);
  if (subIds.length === 0) return [];

  const { data: docs } = await supabase.from('documents')
    .select('related_id, status')
    .eq('related_to', 'subcontractor')
    .in('related_id', subIds);

  const docsData = docs ?? [];
  return subs.map(s => ({
    ...s,
    document_count: docsData.filter(d => d.related_id === s.id).length,
    has_expiring_docs: docsData.some(d => d.related_id === s.id && (d.status === 'expired' || d.status === 'expiring_soon')),
  }));
}

async function getSubcontractorDetailsTool(args: ToolArg, supabase: SupabaseClient) {
  const subId = args.subcontractor_id as string;
  const [{ data: sub, error: subError }, { data: docs }] = await Promise.all([
    supabase.from('subcontractors').select('*').eq('id', subId).single(),
    supabase.from('documents').select('*').eq('related_to', 'subcontractor').eq('related_id', subId),
  ]);
  if (subError || !sub) throw new Error('Subcontractor not found.');
  return { subcontractor: sub, documents: docs ?? [] };
}

async function flagCISIssuesTool(supabase: SupabaseClient, companyId: string | null) {
  let subsQ = supabase.from('subcontractors').select('*').in('cis_status', ['unverified', 'unmatched']);
  if (companyId) subsQ = subsQ.eq('company_id', companyId);
  const { data: subs } = await subsQ;

  let expiredDocsQ = supabase.from('documents')
    .select('*')
    .eq('related_to', 'subcontractor')
    .in('status', ['expired', 'expiring_soon']);
  if (companyId) expiredDocsQ = expiredDocsQ.eq('company_id', companyId);
  const { data: expiredDocs } = await expiredDocsQ;

  return {
    unverified_subcontractors: subs ?? [],
    expiring_or_expired_documents: expiredDocs ?? [],
  };
}

async function verifyCISStatusTool(args: ToolArg, supabase: SupabaseClient) {
  const subId = args.subcontractor_id as string;
  const { data: sub, error: fetchError } = await supabase.from('subcontractors').select('utr_number').eq('id', subId).single();
  if (fetchError || !sub) throw new Error('Subcontractor not found.');

  const newStatus = sub.utr_number ? 'net' : 'unverified';
  const { error } = await supabase.from('subcontractors')
    .update({ cis_status: newStatus, cis_verified_at: new Date().toISOString() })
    .eq('id', subId);
  if (error) throw new Error(error.message);

  return { subcontractor_id: subId, cis_status: newStatus };
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

async function createScheduleEntryTool(args: ToolArg, supabase: SupabaseClient, companyId: string | null) {
  if (!companyId) return { error: 'No company associated with this account' };
  const { data, error } = await supabase.from('schedule_entries').insert({
    company_id: companyId,
    job_id: (args.job_id as string) ?? null,
    title: args.title as string,
    description: (args.description as string) ?? null,
    start_datetime: args.start_datetime as string,
    end_datetime: args.end_datetime as string,
    crew_count: (args.crew_count as number) ?? 1,
    plant_assigned: (args.plant_assigned as string) ?? null,
    notes: (args.notes as string) ?? null,
  })
    .select('*, job:jobs(id, job_number, title, client:clients(id, company_name))')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function getWeeklyScheduleTool(args: ToolArg, supabase: SupabaseClient, companyId: string | null) {
  const startDate = (args.start_date as string) ?? new Date().toISOString().split('T')[0];
  const start = new Date(startDate);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  let query = supabase.from('schedule_entries')
    .select('*, job:jobs(id, job_number, title)')
    .gte('start_datetime', start.toISOString())
    .lt('start_datetime', end.toISOString())
    .order('start_datetime', { ascending: true });
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const grouped: Record<string, unknown[]> = {};
  for (const entry of data ?? []) {
    const day = (entry.start_datetime as string).slice(0, 10);
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(entry);
  }
  return grouped;
}

async function checkAvailabilityTool(args: ToolArg, supabase: SupabaseClient, companyId: string | null) {
  const date = args.date as string;
  const dayStart = `${date}T00:00:00`;
  const dayEnd = `${date}T23:59:59`;

  let query = supabase.from('schedule_entries')
    .select('*')
    .gte('start_datetime', dayStart)
    .lte('start_datetime', dayEnd);
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const entries = data ?? [];

  return { date, is_available: entries.length === 0, conflicts: entries };
}

async function getWeatherRiskTool(args: ToolArg) {
  return {
    date: (args.date as string) ?? new Date().toISOString().split('T')[0],
    risk_level: 'low',
    is_mock: true,
    description: 'Met Office API not configured. Weather risk assessment unavailable.',
  };
}

async function getScheduleOverviewTool(args: ToolArg, supabase: SupabaseClient, companyId: string | null) {
  const month = (args.month as string) ?? new Date().toISOString().slice(0, 7);
  const monthStart = `${month}-01T00:00:00`;
  const monthEnd = new Date(new Date(`${month}-01`).getFullYear(), new Date(`${month}-01`).getMonth() + 1, 1).toISOString();

  let query = supabase.from('schedule_entries')
    .select('*, job:jobs(id, job_number, title)')
    .gte('start_datetime', monthStart)
    .lt('start_datetime', monthEnd)
    .order('start_datetime', { ascending: true });
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const grouped: Record<string, unknown[]> = {};
  for (const entry of data ?? []) {
    const day = (entry.start_datetime as string).slice(0, 10);
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(entry);
  }
  return { month, by_date: grouped, total_entries: (data ?? []).length };
}

// ─── Compliance ───────────────────────────────────────────────────────────────

function deriveStatusFromExpiry(expiryDate: string | null): string {
  if (!expiryDate) return 'active';
  const expiry = new Date(expiryDate);
  const now = new Date();
  if (expiry < now) return 'expired';
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return expiry < thirtyDays ? 'expiring_soon' : 'active';
}

async function addDocumentTool(args: ToolArg, supabase: SupabaseClient, companyId: string | null) {
  if (!companyId) return { error: 'No company associated with this account' };
  const expiryDate = (args.expiry_date as string) ?? null;
  const { data, error } = await supabase.from('documents').insert({
    company_id: companyId,
    name: args.name as string,
    type: args.type as string,
    related_to: (args.related_to as string) ?? null,
    related_id: (args.related_id as string) ?? null,
    expiry_date: expiryDate,
    file_path: (args.file_path as string) ?? null,
    status: deriveStatusFromExpiry(expiryDate),
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function checkComplianceStatusTool(supabase: SupabaseClient, companyId: string | null) {
  let query = supabase.from('documents').select('id, name, type, status, expiry_date, related_to, related_id');
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const docs = data ?? [];
  return {
    active: docs.filter(d => d.status === 'active'),
    expiring_soon: docs.filter(d => d.status === 'expiring_soon'),
    expired: docs.filter(d => d.status === 'expired'),
    overall_status: docs.some(d => d.status === 'expired') ? 'red'
      : docs.some(d => d.status === 'expiring_soon') ? 'amber'
      : 'green',
  };
}

async function flagExpiringDocumentsTool(args: ToolArg, supabase: SupabaseClient, companyId: string | null) {
  const daysAhead = (args.days_ahead as number) ?? 30;
  const now = new Date();
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  let query = supabase.from('documents')
    .select('*')
    .lte('expiry_date', cutoff.toISOString().split('T')[0])
    .order('expiry_date', { ascending: true });
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return { days_ahead: daysAhead, documents: data ?? [] };
}

async function getJobDocumentsTool(args: ToolArg, supabase: SupabaseClient) {
  const { data, error } = await supabase.from('documents')
    .select('*')
    .eq('related_to', 'job')
    .eq('related_id', args.job_id as string)
    .order('expiry_date', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function getSubcontractorDocumentsTool(args: ToolArg, supabase: SupabaseClient) {
  const { data, error } = await supabase.from('documents')
    .select('*')
    .eq('related_to', 'subcontractor')
    .eq('related_id', args.subcontractor_id as string)
    .order('expiry_date', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Reporting ────────────────────────────────────────────────────────────────

async function getRevenueReportTool(args: ToolArg, supabase: SupabaseClient, companyId: string | null) {
  const months = (args.months as number) ?? 6;
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  let query = supabase.from('invoices')
    .select('total_amount, created_at')
    .eq('status', 'paid')
    .gte('created_at', since.toISOString());
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const byMonth: Record<string, { month: string; total: number; invoice_count: number }> = {};
  for (const inv of data ?? []) {
    const month = (inv.created_at as string).slice(0, 7);
    if (!byMonth[month]) byMonth[month] = { month, total: 0, invoice_count: 0 };
    byMonth[month].total += inv.total_amount as number;
    byMonth[month].invoice_count += 1;
  }

  const monthlyData = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
  const grandTotal = monthlyData.reduce((sum, m) => sum + m.total, 0);
  const averageMonthly = monthlyData.length > 0 ? grandTotal / monthlyData.length : 0;

  return { monthly: monthlyData, grand_total: grandTotal, average_monthly: averageMonthly };
}

async function getProfitabilityReportTool(args: ToolArg, supabase: SupabaseClient, companyId: string | null) {
  if (args.job_id) {
    const { data: quotes } = await supabase.from('quotes')
      .select('total_amount, status')
      .eq('job_id', args.job_id as string)
      .eq('status', 'accepted');
    const { data: invoices } = await supabase.from('invoices')
      .select('total_amount, status')
      .eq('job_id', args.job_id as string);
    const quoteValue = (quotes ?? []).reduce((sum, q) => sum + (q.total_amount as number), 0);
    const invoicedValue = (invoices ?? []).reduce((sum, i) => sum + (i.total_amount as number), 0);
    const paidValue = (invoices ?? []).filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total_amount as number), 0);
    return { job_id: args.job_id, quoted_value: quoteValue, invoiced_value: invoicedValue, paid_value: paidValue };
  }

  let jobsQ = supabase.from('jobs').select('id, job_number, title, value, status');
  if (companyId) jobsQ = jobsQ.eq('company_id', companyId);
  const { data: jobs } = await jobsQ;

  let invoicesQ = supabase.from('invoices').select('job_id, total_amount, status');
  if (companyId) invoicesQ = invoicesQ.eq('company_id', companyId);
  const { data: invoices } = await invoicesQ;

  const invByJob: Record<string, number> = {};
  for (const inv of invoices ?? []) {
    if (inv.job_id) invByJob[inv.job_id as string] = (invByJob[inv.job_id as string] ?? 0) + (inv.total_amount as number);
  }

  return (jobs ?? []).map(job => ({
    job_id: job.id,
    job_number: job.job_number,
    title: job.title,
    status: job.status,
    job_value: job.value ?? 0,
    invoiced_value: invByJob[job.id as string] ?? 0,
  }));
}

async function getOverdueSummaryTool(supabase: SupabaseClient, companyId: string | null) {
  const today = new Date().toISOString().split('T')[0];

  let invoicesQ = supabase.from('invoices').select('*').eq('status', 'overdue');
  let jobsQ = supabase.from('jobs').select('*').eq('status', 'active').lt('end_date', today).not('end_date', 'is', null);
  let docsQ = supabase.from('documents').select('*').eq('status', 'expired');
  if (companyId) {
    invoicesQ = invoicesQ.eq('company_id', companyId);
    jobsQ = jobsQ.eq('company_id', companyId);
    docsQ = docsQ.eq('company_id', companyId);
  }

  const [invoicesResult, jobsResult, docsResult] = await Promise.all([invoicesQ, jobsQ, docsQ]);
  return {
    overdue_invoices: invoicesResult.data ?? [],
    delayed_jobs: jobsResult.data ?? [],
    expired_documents: docsResult.data ?? [],
  };
}

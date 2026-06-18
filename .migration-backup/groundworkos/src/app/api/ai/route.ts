import { NextRequest, NextResponse } from 'next/server';
import { Mistral } from '@mistralai/mistralai';
import { tools } from '@/lib/mistral-tools';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import * as clientTools from 'groundworkos-mcp/servers/clients-mcp/tools';
import * as jobTools from 'groundworkos-mcp/servers/jobs-mcp/tools';
import * as quoteTools from 'groundworkos-mcp/servers/quotes-mcp/tools';
import * as invoiceTools from 'groundworkos-mcp/servers/invoices-mcp/tools';
import * as subconTools from 'groundworkos-mcp/servers/subcon-mcp/tools';
import * as scheduleTools from 'groundworkos-mcp/servers/schedule-mcp/tools';
import * as complianceTools from 'groundworkos-mcp/servers/compliance-mcp/tools';
import * as reportingTools from 'groundworkos-mcp/servers/reporting-mcp/tools';

type ToolArg = Record<string, unknown>;

// Build the Mistral client lazily so a missing key surfaces as a handled
// request error rather than crashing the whole route module at import time.
function getMistralClient(): Mistral {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY is not set');
  }
  return new Mistral({ apiKey });
}

export async function POST(request: NextRequest) {
  try {
    const mistral = getMistralClient();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const { data: userCompany } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    const companyId: string | null = userCompany?.company_id ?? null;

    const { messages } = await request.json() as { messages: unknown[] };
    if (!Array.isArray(messages)) {
      return NextResponse.json({ data: null, error: 'A messages array is required.' }, { status: 400 });
    }

    // First call: non-streaming to detect tool use
    const firstResponse = await mistral.chat.complete({
      model: 'mistral-small-latest',
      messages: messages as Parameters<typeof mistral.chat.complete>[0]['messages'],
      tools: tools as unknown as Parameters<typeof mistral.chat.complete>[0]['tools'],
      toolChoice: 'auto',
    });

    const assistantMessage = firstResponse.choices?.[0]?.message;
    if (!assistantMessage) {
      return NextResponse.json({ data: null, error: 'No response from AI' }, { status: 500 });
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
        let args: ToolArg;
        try {
          args =
            typeof tc.function.arguments === 'string'
              ? (JSON.parse(tc.function.arguments) as ToolArg)
              : (tc.function.arguments as ToolArg);
        } catch {
          return {
            role: 'tool' as const,
            toolCallId: tc.id ?? '',
            name: tc.function.name,
            content: JSON.stringify({ error: 'Invalid tool arguments received.' }),
          };
        }
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
            if (typeof content === 'string' && content) controller.enqueue(encoder.encode(content));
          }
        } catch (err) {
          console.error('[AI route] Stream error:', err);
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  } catch (error) {
    console.error('[AI route] Error:', error);
    return NextResponse.json({ data: null, error: 'Failed to process AI request' }, { status: 500 });
  }
}

async function executeTool(
  toolName: string,
  args: unknown,
  supabase: SupabaseClient,
  companyId: string | null
): Promise<unknown> {
  try {
    // Weather risk needs neither a company context nor the database.
    if (toolName === 'get_weather_risk') {
      return await scheduleTools.getWeatherRisk(args as scheduleTools.GetWeatherRiskInput);
    }

    // Every other tool reads or writes tenant data. Because the MCP database
    // client uses the service-role key (which bypasses RLS), the company scope
    // MUST be enforced here in application code — refuse if it is missing.
    if (!companyId) {
      return { error: 'No company associated with this account' };
    }

    switch (toolName) {
      // ── Clients ──────────────────────────────────────────────────────────────
      case 'create_client':
        return await clientTools.createClient(args as clientTools.CreateClientInput, supabase, companyId);
      case 'get_client':
        return await clientTools.getClient(args as clientTools.GetClientInput, supabase, companyId);
      case 'search_clients':
        return await clientTools.searchClients(args as clientTools.SearchClientsInput, supabase, companyId);
      case 'get_client_history':
        return await clientTools.getClientHistory(args as clientTools.GetClientHistoryInput, supabase, companyId);
      case 'update_client':
        return await clientTools.updateClient(args as clientTools.UpdateClientInput, supabase, companyId);

      // ── Jobs ─────────────────────────────────────────────────────────────────
      case 'create_job':
        return await jobTools.createJob(args as jobTools.CreateJobInput, supabase, companyId);
      case 'update_job_status':
        return await jobTools.updateJobStatus(args as jobTools.UpdateJobStatusInput, supabase, companyId);
      case 'update_job_progress':
        return await jobTools.updateJobProgress(args as jobTools.UpdateJobProgressInput, supabase, companyId);
      case 'get_job_details':
        return await jobTools.getJobDetails(args as jobTools.GetJobDetailsInput, supabase, companyId);
      case 'list_jobs':
        return await jobTools.listJobs(args as jobTools.ListJobsInput, supabase, companyId);
      case 'get_job_summary_stats':
        return await jobTools.getJobSummaryStats(supabase, companyId);
      case 'get_entity_history':
        return await jobTools.getEntityHistory(args as jobTools.GetEntityHistoryInput, supabase, companyId);

      // ── Quotes ───────────────────────────────────────────────────────────────
      case 'create_quote':
        return await quoteTools.createQuote(args as quoteTools.CreateQuoteInput, supabase, companyId);
      case 'update_quote':
        return await quoteTools.updateQuote(args as quoteTools.UpdateQuoteInput, supabase, companyId);
      case 'send_quote':
        return await quoteTools.sendQuote(args as quoteTools.SendQuoteInput, supabase, companyId);
      case 'accept_quote':
        return await quoteTools.acceptQuote(args as quoteTools.AcceptQuoteInput, supabase, companyId);
      case 'convert_quote_to_job':
        return await quoteTools.convertQuoteToJob(args as quoteTools.ConvertQuoteToJobInput, supabase, companyId);
      case 'list_quotes':
        return await quoteTools.listQuotes(args as quoteTools.ListQuotesInput, supabase, companyId);
      case 'get_rate_book':
        return await quoteTools.getRateBook(args as quoteTools.GetRateBookInput, supabase, companyId);

      // ── Invoices ─────────────────────────────────────────────────────────────
      case 'create_invoice':
        return await invoiceTools.createInvoice(args as invoiceTools.CreateInvoiceInput, supabase, companyId);
      case 'mark_invoice_paid':
        return await invoiceTools.markInvoicePaid(args as invoiceTools.MarkInvoicePaidInput, supabase, companyId);
      case 'get_outstanding_invoices':
        return await invoiceTools.getOutstandingInvoices(supabase, companyId);
      case 'get_invoice_summary':
        return await invoiceTools.getInvoiceSummary(args as invoiceTools.GetInvoiceSummaryInput, supabase, companyId);
      case 'send_invoice':
        return await invoiceTools.sendInvoice(args as invoiceTools.SendInvoiceInput, supabase, companyId);

      // ── Subcontractors ───────────────────────────────────────────────────────
      case 'create_subcontractor':
        return await subconTools.createSubcontractor(args as subconTools.CreateSubcontractorInput, supabase, companyId);
      case 'verify_cis_status':
        return await subconTools.verifyCISStatus(args as subconTools.VerifyCISStatusInput, supabase, companyId);
      case 'list_subcontractors':
        return await subconTools.listSubcontractors(supabase, companyId);
      case 'get_subcontractor_details':
        return await subconTools.getSubcontractorDetails(args as subconTools.GetSubcontractorDetailsInput, supabase, companyId);
      case 'flag_cis_issues':
        return await subconTools.flagCISIssues(supabase, companyId);

      // ── Schedule ─────────────────────────────────────────────────────────────
      case 'create_schedule_entry':
        return await scheduleTools.createScheduleEntry(args as scheduleTools.CreateScheduleEntryInput, supabase, companyId);
      case 'get_weekly_schedule':
        return await scheduleTools.getWeeklySchedule(args as scheduleTools.GetWeeklyScheduleInput, supabase, companyId);
      case 'check_availability':
        return await scheduleTools.checkAvailability(args as scheduleTools.CheckAvailabilityInput, supabase, companyId);
      case 'get_schedule_overview':
        return await scheduleTools.getScheduleOverview(args as scheduleTools.GetScheduleOverviewInput, supabase, companyId);

      // ── Compliance ───────────────────────────────────────────────────────────
      case 'add_document':
        return await complianceTools.addDocument(args as complianceTools.AddDocumentInput, supabase, companyId);
      case 'check_compliance_status':
        return await complianceTools.checkComplianceStatus(supabase, companyId);
      case 'flag_expiring_documents':
        return await complianceTools.flagExpiringDocuments(args as complianceTools.FlagExpiringDocumentsInput, supabase, companyId);
      case 'get_job_documents':
        return await complianceTools.getJobDocuments(args as complianceTools.GetJobDocumentsInput, supabase, companyId);
      case 'get_subcontractor_documents':
        return await complianceTools.getSubcontractorDocuments(args as complianceTools.GetSubcontractorDocumentsInput, supabase, companyId);

      // ── Reporting ────────────────────────────────────────────────────────────
      case 'get_pipeline_summary':
        return await reportingTools.getPipelineSummary(supabase, companyId);
      case 'get_revenue_report':
        return await reportingTools.getRevenueReport(args as reportingTools.GetRevenueReportInput, supabase, companyId);
      case 'get_profitability_report':
        return await reportingTools.getProfitabilityReport(args as reportingTools.GetProfitabilityReportInput, supabase, companyId);
      case 'get_daily_briefing':
        return await reportingTools.getDailyBriefing(supabase, companyId);
      case 'get_overdue_summary':
        return await reportingTools.getOverdueSummary(supabase, companyId);
      case 'get_aged_debtor_report':
        return await reportingTools.getAgedDebtorReport(supabase, companyId);
      case 'get_cis_monthly_return':
        return await reportingTools.getCISMonthlyReturn(args as reportingTools.GetCISMonthlyReturnInput, supabase, companyId);
      case 'get_subcontractor_payment_schedule':
        return await reportingTools.getSubcontractorPaymentSchedule(args as reportingTools.GetSubcontractorPaymentScheduleInput, supabase, companyId);

      default:
        return { error: `Tool ${toolName} not implemented` };
    }
  } catch (error) {
    console.error(`[AI tool: ${toolName}] Error:`, error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

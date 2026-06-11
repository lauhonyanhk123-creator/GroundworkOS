import type { SupabaseClient } from '@supabase/supabase-js';

import * as clientTools from 'groundworkos-mcp/servers/clients-mcp/tools';
import * as jobTools from 'groundworkos-mcp/servers/jobs-mcp/tools';
import * as quoteTools from 'groundworkos-mcp/servers/quotes-mcp/tools';
import * as invoiceTools from 'groundworkos-mcp/servers/invoices-mcp/tools';
import * as subconTools from 'groundworkos-mcp/servers/subcon-mcp/tools';
import * as scheduleTools from 'groundworkos-mcp/servers/schedule-mcp/tools';
import * as complianceTools from 'groundworkos-mcp/servers/compliance-mcp/tools';
import * as reportingTools from 'groundworkos-mcp/servers/reporting-mcp/tools';

// Single dispatcher for every MCP tool, shared by the AI route (Mistral tool
// calls) and the /api/tools route (UI mutations), so both run the same
// business logic. The Supabase client passed in is the caller's RLS-scoped
// session client and every tool additionally filters by companyId, giving two
// independent layers of tenant isolation.
export async function executeTool(
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

    // Every other tool reads or writes tenant data — refuse without a company.
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
      case 'update_job':
        return await jobTools.updateJob(args as jobTools.UpdateJobInput, supabase, companyId);
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
      case 'delete_quote':
        return await quoteTools.deleteQuote(args as quoteTools.DeleteQuoteInput, supabase, companyId);
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
      case 'update_invoice':
        return await invoiceTools.updateInvoice(args as invoiceTools.UpdateInvoiceInput, supabase, companyId);
      case 'void_invoice':
        return await invoiceTools.voidInvoice(args as invoiceTools.VoidInvoiceInput, supabase, companyId);
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
      case 'update_subcontractor':
        return await subconTools.updateSubcontractor(args as subconTools.UpdateSubcontractorInput, supabase, companyId);
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
      case 'update_schedule_entry':
        return await scheduleTools.updateScheduleEntry(args as scheduleTools.UpdateScheduleEntryInput, supabase, companyId);
      case 'delete_schedule_entry':
        return await scheduleTools.deleteScheduleEntry(args as scheduleTools.DeleteScheduleEntryInput, supabase, companyId);
      case 'get_weekly_schedule':
        return await scheduleTools.getWeeklySchedule(args as scheduleTools.GetWeeklyScheduleInput, supabase, companyId);
      case 'check_availability':
        return await scheduleTools.checkAvailability(args as scheduleTools.CheckAvailabilityInput, supabase, companyId);
      case 'get_schedule_overview':
        return await scheduleTools.getScheduleOverview(args as scheduleTools.GetScheduleOverviewInput, supabase, companyId);

      // ── Compliance ───────────────────────────────────────────────────────────
      case 'add_document':
        return await complianceTools.addDocument(args as complianceTools.AddDocumentInput, supabase, companyId);
      case 'update_document':
        return await complianceTools.updateDocument(args as complianceTools.UpdateDocumentInput, supabase, companyId);
      case 'delete_document':
        return await complianceTools.deleteDocument(args as complianceTools.DeleteDocumentInput, supabase, companyId);
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
    console.error(`[tool: ${toolName}] Error:`, error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

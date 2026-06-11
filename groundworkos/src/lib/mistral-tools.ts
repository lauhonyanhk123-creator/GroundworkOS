// Note: We'll refactor the MCP server tool handlers to be importable
// For now, let's define the tool schemas for Mistral

import { z } from 'zod';

// Tool definitions for Mistral AI (parameters declared as Zod schemas)
const toolDefinitions = [
  // Clients MCP tools
  {
    type: 'function' as const,
    function: {
      name: 'create_client',
      description: 'Create a new client in the CRM',
      parameters: z.object({
        company_name: z.string(),
        contact_name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        companies_house_number: z.string().optional(),
        notes: z.string().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_client',
      description: 'Get a single client by ID with their stats',
      parameters: z.object({
        client_id: z.string(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_clients',
      description: 'Search clients by company name or contact name',
      parameters: z.object({
        query: z.string(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_client_history',
      description: 'Get full history for a client including jobs, quotes, and invoices',
      parameters: z.object({
        client_id: z.string(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_client',
      description: 'Update client details',
      parameters: z.object({
        client_id: z.string(),
        company_name: z.string().optional(),
        contact_name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        companies_house_number: z.string().optional(),
        notes: z.string().optional(),
      }).strict(),
    },
  },
  // Jobs MCP tools
  {
    type: 'function' as const,
    function: {
      name: 'create_job',
      description: 'Create a new job/project',
      parameters: z.object({
        client_id: z.string().optional(),
        title: z.string(),
        description: z.string().optional(),
        site_address: z.string().optional(),
        type: z.string().optional(),
        value: z.number().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        subcontractor_id: z.string().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_job',
      description: 'Edit the details of an existing job: title, description, site address, type, value, dates, client, or the subcontractor working the job. Use when the user asks to change, correct, or assign something on a job. For status changes use update_job_status instead.',
      parameters: z.object({
        job_id: z.string(),
        client_id: z.string().optional(),
        subcontractor_id: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        site_address: z.string().optional(),
        type: z.string().optional(),
        value: z.number().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_job_status',
      description: 'Update a job\'s status',
      parameters: z.object({
        job_id: z.string(),
        status: z.string(),
        notes: z.string().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_job_progress',
      description: 'Update job progress percentage and log a site visit note',
      parameters: z.object({
        job_id: z.string(),
        progress_percent: z.number(),
        notes: z.string().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_job_details',
      description: 'Get full details for a job',
      parameters: z.object({
        job_id: z.string(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_jobs',
      description: 'List jobs with optional filters',
      parameters: z.object({
        status: z.string().optional(),
        client_id: z.string().optional(),
        limit: z.number().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_job_summary_stats',
      description: 'Get dashboard stats for all jobs',
      parameters: z.object({}).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_entity_history',
      description: 'Retrieve the full status change history for a job, quote, or invoice. Use when the user asks about status changes, audit trail, or history for a specific entity.',
      parameters: z.object({
        entity_type: z.enum(['job', 'quote', 'invoice']),
        entity_id: z.string(),
      }).strict(),
    },
  },
  // Quotes MCP tools
  {
    type: 'function' as const,
    function: {
      name: 'create_quote',
      description: 'Create a new quote for a client',
      parameters: z.object({
        client_id: z.string().optional(),
        title: z.string(),
        line_items: z.array(z.object({
          description: z.string(),
          quantity: z.number(),
          unit_price: z.number(),
        })),
        notes: z.string().optional(),
        job_id: z.string().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_quote',
      description: 'Update the line items or notes of a draft or sent quote and recalculate totals. Accepted and rejected quotes cannot be edited.',
      parameters: z.object({
        quote_id: z.string(),
        line_items: z.array(z.object({
          description: z.string(),
          quantity: z.number(),
          unit_price: z.number(),
        })).optional(),
        notes: z.string().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_quote',
      description: 'Permanently delete a draft quote, for example a duplicate or abandoned one. Sent, accepted, and rejected quotes cannot be deleted — they are kept for pricing history.',
      parameters: z.object({
        quote_id: z.string(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_quote',
      description: 'Mark a quote as sent to the client',
      parameters: z.object({
        quote_id: z.string(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'accept_quote',
      description: 'Mark a quote as accepted by the client',
      parameters: z.object({
        quote_id: z.string(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'convert_quote_to_job',
      description: 'Convert an accepted quote into an active job',
      parameters: z.object({
        quote_id: z.string(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_quotes',
      description: 'List all quotes with optional status filter',
      parameters: z.object({
        status: z.string().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_rate_book',
      description: 'Get the company rate book built from historical quote line items: suggested unit rate, price range, win rate and last-used date per work item. Use when the user asks what to charge for something, what was charged before, usual or going rates, or pricing history for an item of work.',
      parameters: z.object({
        search: z.string().optional(),
        limit: z.number().optional(),
      }).strict(),
    },
  },
  // Invoices MCP tools
  {
    type: 'function' as const,
    function: {
      name: 'create_invoice',
      description: 'Create an invoice for a completed job',
      parameters: z.object({
        client_id: z.string(),
        job_id: z.string().optional(),
        quote_id: z.string().optional(),
        subtotal: z.number(),
        due_date: z.string(),
        notes: z.string().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_invoice',
      description: 'Edit a draft invoice: client, linked job or quote, subtotal (VAT and total are recalculated), due date, or notes. Sent invoices cannot be edited — void and re-issue instead.',
      parameters: z.object({
        invoice_id: z.string(),
        client_id: z.string().optional(),
        job_id: z.string().optional(),
        quote_id: z.string().optional(),
        subtotal: z.number().optional(),
        due_date: z.string().optional(),
        notes: z.string().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'void_invoice',
      description: 'Void a mistaken or cancelled invoice. The invoice stays on record for the audit trail but is excluded from outstanding totals. Paid invoices cannot be voided. Use when the user asks to cancel, void, or write off an invoice.',
      parameters: z.object({
        invoice_id: z.string(),
        notes: z.string().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'mark_invoice_paid',
      description: 'Mark an invoice as paid',
      parameters: z.object({
        invoice_id: z.string(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_outstanding_invoices',
      description: 'Get all unpaid invoices ordered by most overdue first',
      parameters: z.object({}).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_invoice_summary',
      description: 'Get revenue summary for dashboard',
      parameters: z.object({
        months_back: z.number().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_invoice',
      description: 'Mark invoice as sent',
      parameters: z.object({
        invoice_id: z.string(),
      }).strict(),
    },
  },
  // Subcon MCP tools
  {
    type: 'function' as const,
    function: {
      name: 'create_subcontractor',
      description: 'Create a new subcontractor',
      parameters: z.object({
        company_name: z.string(),
        contact_name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        trade: z.string().optional(),
        utr_number: z.string().optional(),
        notes: z.string().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_subcontractor',
      description: 'Edit a subcontractor\'s details: company name, contact, email, phone, trade, UTR number, or notes. Changing the UTR resets their CIS status to unverified. Use when the user asks to change or correct subcontractor information.',
      parameters: z.object({
        subcontractor_id: z.string(),
        company_name: z.string().optional(),
        contact_name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        trade: z.string().optional(),
        utr_number: z.string().optional(),
        notes: z.string().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'verify_cis_status',
      description: 'Verify a subcontractor\'s CIS status with HMRC',
      parameters: z.object({
        subcontractor_id: z.string(),
        utr_number: z.string(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_subcontractors',
      description: 'List all subcontractors with document counts',
      parameters: z.object({}).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_subcontractor_details',
      description: 'Get full details for a subcontractor including all documents and payment history',
      parameters: z.object({
        subcontractor_id: z.string(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'flag_cis_issues',
      description: 'Find all subcontractors with unverified or expired CIS documents',
      parameters: z.object({}).strict(),
    },
  },
  // Schedule MCP tools
  {
    type: 'function' as const,
    function: {
      name: 'create_schedule_entry',
      description: 'Create a new schedule entry',
      parameters: z.object({
        job_id: z.string().optional(),
        title: z.string(),
        description: z.string().optional(),
        start_datetime: z.string(),
        end_datetime: z.string(),
        crew_count: z.number().optional(),
        plant_assigned: z.string().optional(),
        notes: z.string().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_schedule_entry',
      description: 'Edit an existing schedule entry: title, start/end times, crew count, plant, linked job, or notes. Use when the user asks to move, reschedule, or change a booking.',
      parameters: z.object({
        entry_id: z.string(),
        job_id: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        start_datetime: z.string().optional(),
        end_datetime: z.string().optional(),
        crew_count: z.number().optional(),
        plant_assigned: z.string().optional(),
        notes: z.string().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_schedule_entry',
      description: 'Delete a schedule entry, for example a cancelled or duplicated booking. Use when the user asks to remove or cancel something from the schedule.',
      parameters: z.object({
        entry_id: z.string(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_weekly_schedule',
      description: 'Get schedule for a week starting on Monday',
      parameters: z.object({
        week_start_date: z.string(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'check_availability',
      description: 'Check if a date is available for scheduling',
      parameters: z.object({
        date: z.string(),
        plant_name: z.string().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_weather_risk',
      description: 'Get weather forecast and risk level for scheduling',
      parameters: z.object({
        date: z.string(),
        postcode: z.string().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_schedule_overview',
      description: 'Get all schedule entries for a month with date grouping',
      parameters: z.object({
        month: z.number().optional(),
        year: z.number().optional(),
      }).strict(),
    },
  },
  // Compliance MCP tools
  {
    type: 'function' as const,
    function: {
      name: 'add_document',
      description: 'Add a new document to the system',
      parameters: z.object({
        name: z.string(),
        type: z.string(),
        related_to: z.string().optional(),
        related_id: z.string().optional(),
        file_path: z.string().optional(),
        expiry_date: z.string().optional(),
        notes: z.string().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_document',
      description: 'Edit a document record: name, type, expiry date, or the job/subcontractor it relates to. Status is re-derived when the expiry date changes. Use when the user asks to correct or renew a document.',
      parameters: z.object({
        document_id: z.string(),
        name: z.string().optional(),
        type: z.string().optional(),
        related_to: z.string().optional(),
        related_id: z.string().optional(),
        expiry_date: z.string().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_document',
      description: 'Delete a document record and its stored file, for example a duplicate or superseded upload. Use when the user asks to remove a document.',
      parameters: z.object({
        document_id: z.string(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'check_compliance_status',
      description: 'Full compliance health check - find expired and expiring documents',
      parameters: z.object({}).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'flag_expiring_documents',
      description: 'Get documents expiring within specified days',
      parameters: z.object({
        days_ahead: z.number().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_job_documents',
      description: 'Get all documents for a specific job',
      parameters: z.object({
        job_id: z.string(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_subcontractor_documents',
      description: 'Get all documents for a specific subcontractor including CIS and insurance',
      parameters: z.object({
        subcontractor_id: z.string(),
      }).strict(),
    },
  },
  // Reporting MCP tools
  {
    type: 'function' as const,
    function: {
      name: 'get_pipeline_summary',
      description: 'Get full pipeline summary for dashboard',
      parameters: z.object({}).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_revenue_report',
      description: 'Get revenue report grouped by month',
      parameters: z.object({
        months_back: z.number().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_profitability_report',
      description: 'Get profitability report comparing quotes vs invoices',
      parameters: z.object({
        job_id: z.string().optional(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_daily_briefing',
      description: 'AI-ready summary of today\'s key information',
      parameters: z.object({}).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_overdue_summary',
      description: 'Get all overdue items across the system',
      parameters: z.object({}).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_aged_debtor_report',
      description: 'Get an aged debtor report showing outstanding invoices grouped by age buckets: current, 1-30, 31-60, 61-90, and 90+ days overdue. Use when the user asks about aged debtors, outstanding debt analysis, or overdue invoice ageing.',
      parameters: z.object({}).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_cis_monthly_return',
      description: 'Get a CIS monthly return showing all subcontractor payments with gross amount, CIS deduction at the HMRC rate for their status (0% gross, 20% net/verified, 30% unverified), and net payment for a given month and year. Use when the user asks about CIS returns, monthly CIS submissions, or subcontractor deductions.',
      parameters: z.object({
        month: z.number().min(1).max(12),
        year: z.number(),
      }).strict(),
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_subcontractor_payment_schedule',
      description: 'Get a payment schedule for one or all subcontractors, optionally filtered by UK tax year (e.g. "2025-26"). Returns payments grouped by subcontractor with running totals. Use when the user asks about subcontractor payment history or annual CIS summaries.',
      parameters: z.object({
        subcontractor_id: z.string().optional(),
        tax_year: z.string().optional(),
      }).strict(),
    },
  },
];

// The Mistral API expects each tool's `parameters` to be a JSON Schema object,
// not a Zod schema. Convert once at module load using Zod's native converter
// (Zod 4) and drop the `$schema` meta key the API does not need.
export const tools = toolDefinitions.map((tool) => {
  const { $schema: _schema, ...parameters } = z.toJSONSchema(tool.function.parameters) as Record<string, unknown>;
  return {
    type: 'function' as const,
    function: {
      name: tool.function.name,
      description: tool.function.description,
      parameters,
    },
  };
});

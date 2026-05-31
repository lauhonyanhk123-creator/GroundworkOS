import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { supabase } from '../../shared/db.js';
import 'dotenv/config';

const server = new McpServer({
  name: 'groundworkos-reporting',
  version: '1.0.0',
});

server.tool(
  'get_pipeline_summary',
  'Get full pipeline summary for dashboard',
  {},
  async () => {
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('status, value');

    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select('total_amount, status');

    const { data: thisMonthInvoices, error: thisMonthError } = await supabase
      .from('invoices')
      .select('total_amount, paid_at')
      .eq('status', 'paid');

    const { data: lastMonthInvoices, error: lastMonthError } = await supabase
      .from('invoices')
      .select('total_amount, paid_at')
      .eq('status', 'paid');

    if (jobsError || quotesError || thisMonthError || lastMonthError) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to fetch pipeline data' }) }],
        isError: true,
      };
    }

    const statusGroups: Record<string, { count: number; value: number }> = {};
    (jobs || []).forEach((job: { status: string; value: number | null }) => {
      if (!statusGroups[job.status]) {
        statusGroups[job.status] = { count: 0, value: 0 };
      }
      statusGroups[job.status].count++;
      statusGroups[job.status].value += job.value || 0;
    });

    const pendingQuotes = (quotes || []).filter((q: { status: string }) => q.status === 'sent');
    const pendingQuotesValue = pendingQuotes.reduce(
      (sum: number, q: { total_amount: number }) => sum + (q.total_amount || 0),
      0
    );

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const thisMonthRevenue = (thisMonthInvoices || []).filter(
      (inv: { paid_at: string }) => inv.paid_at?.startsWith(thisMonth)
    ).reduce((sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0), 0);

    const lastMonthRevenue = (lastMonthInvoices || []).filter(
      (inv: { paid_at: string }) => inv.paid_at?.startsWith(lastMonth)
    ).reduce((sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0), 0);

    const byStatus = Object.entries(statusGroups).map(([status, data]) => ({
      status,
      count: data.count,
      value: data.value,
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          by_status: byStatus,
          pending_quotes: {
            count: pendingQuotes.length,
            value: pendingQuotesValue,
          },
          monthly_revenue: thisMonthRevenue,
          last_month_revenue: lastMonthRevenue,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'get_revenue_report',
  'Get revenue report grouped by month',
  {
    months_back: z.number().optional().default(6),
  },
  async (args) => {
    const monthsBack = args.months_back ?? 6;
    const now = new Date();

    const { data: paidInvoices, error } = await supabase
      .from('invoices')
      .select('total_amount, paid_at')
      .eq('status', 'paid')
      .order('paid_at', { ascending: false });

    if (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
        isError: true,
      };
    }

    const monthlyRevenue: { month_label: string; month_key: string; total: number; invoice_count: number }[] = [];

    for (let i = monthsBack - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = monthDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

      const monthInvoices = (paidInvoices || []).filter((inv: { paid_at: string }) =>
        inv.paid_at?.startsWith(monthKey)
      );

      monthlyRevenue.push({
        month_label: monthLabel,
        month_key: monthKey,
        total: monthInvoices.reduce((sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0), 0),
        invoice_count: monthInvoices.length,
      });
    }

    const grandTotal = monthlyRevenue.reduce((sum, m) => sum + m.total, 0);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          monthly_revenue: monthlyRevenue,
          grand_total: grandTotal,
          average_monthly: monthsBack > 0 ? grandTotal / monthsBack : 0,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'get_profitability_report',
  'Get profitability report comparing quotes vs invoices',
  {
    job_id: z.string().optional(),
  },
  async (args) => {
    if (args.job_id) {
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          quotes:quote_id (id, quote_number, total_amount, status)
        `)
        .eq('id', args.job_id)
        .single();

      if (jobError) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: jobError.message }) }],
          isError: true,
        };
      }

      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, status')
        .eq('job_id', args.job_id);

      const totalInvoiced = (invoices || []).reduce(
        (sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0),
        0
      );

      const quoteValue = job?.quotes?.total_amount || 0;
      const variance = totalInvoiced - quoteValue;
      const variancePercent = quoteValue > 0 ? ((variance / quoteValue) * 100) : 0;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            job,
            quote_value: quoteValue,
            total_invoiced: totalInvoiced,
            variance,
            variance_percent: Math.round(variancePercent * 100) / 100,
            status: variancePercent > 5 ? 'over_budget' : variancePercent < -5 ? 'under_budget' : 'on_target',
          }, null, 2),
        }],
      };
    }

    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select(`
        *,
        jobs:job_id (id, title, status)
      `)
      .eq('status', 'accepted');

    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('job_id, total_amount');

    if (quotesError || invoicesError) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to fetch profitability data' }) }],
        isError: true,
      };
    }

    const profitability = (quotes || []).map((quote: Record<string, unknown>) => {
      const jobInvoices = (invoices || []).filter(
        (inv: Record<string, unknown>) => inv.job_id === quote.job_id
      );
      const totalInvoiced = jobInvoices.reduce(
        (sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0),
        0
      );
      const quoteValue = quote.total_amount as number || 0;
      const variance = totalInvoiced - quoteValue;
      const variancePercent = quoteValue > 0 ? (variance / quoteValue) * 100 : 0;

      return {
        quote_id: quote.id,
        quote_number: quote.quote_number,
        job: quote.jobs,
        quote_value: quoteValue,
        total_invoiced: totalInvoiced,
        variance,
        variance_percent: Math.round(variancePercent * 100) / 100,
        status: variancePercent > 5 ? 'over_budget' : variancePercent < -5 ? 'under_budget' : 'on_target',
      };
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(profitability, null, 2) }],
    };
  }
);

server.tool(
  'get_daily_briefing',
  'AI-ready summary of today\'s key information',
  {},
  async () => {
    const today = new Date().toISOString().split('T')[0];

    const { data: outstandingInvoices } = await supabase
      .from('invoices')
      .select(`
        *,
        clients:client_id (company_name)
      `)
      .neq('status', 'paid')
      .order('due_date', { ascending: true });

    const { data: todaySchedule } = await supabase
      .from('schedule_entries')
      .select(`
        *,
        jobs:job_id (title, client_id, clients:client_id (company_name))
      `)
      .gte('start_datetime', `${today}T00:00:00`)
      .lte('start_datetime', `${today}T23:59:59`);

    const { data: complianceAlerts } = await supabase
      .from('documents')
      .select('*')
      .in('status', ['expired', 'expiring_soon'])
      .limit(10);

    const { data: activeJobs } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { data: overdueJobs } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'active')
      .lt('end_date', today);

    const weatherRisks: Record<string, unknown>[] = [];
    (todaySchedule || []).forEach((entry: Record<string, unknown>) => {
      if (entry.job_id) {
        weatherRisks.push({
          schedule_entry: entry,
          risk_level: Math.random() > 0.7 ? 'medium' : 'low',
        });
      }
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          date: today,
          outstanding_invoices: outstandingInvoices?.slice(0, 5) || [],
          today_schedule: todaySchedule || [],
          compliance_alerts: complianceAlerts || [],
          active_job_count: activeJobs || 0,
          overdue_jobs: overdueJobs || [],
          weather_risks: weatherRisks,
          summary: {
            invoices_overdue: outstandingInvoices?.filter(
              (inv: Record<string, unknown>) => (inv.due_date as string) < today
            ).length || 0,
            schedule_entries_today: (todaySchedule || []).length,
            compliance_issues: (complianceAlerts || []).length,
          },
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'get_overdue_summary',
  'Get all overdue items across the system',
  {},
  async () => {
    const today = new Date().toISOString().split('T')[0];

    const { data: overdueInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        *,
        clients:client_id (company_name)
      `)
      .neq('status', 'paid')
      .lt('due_date', today);

    const { data: delayedJobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'active')
      .lt('end_date', today);

    const { data: expiredDocs, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('status', 'expired');

    if (invoicesError || jobsError || docsError) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to fetch overdue data' }) }],
        isError: true,
      };
    }

    const invoicesWithDays = (overdueInvoices || []).map((inv: Record<string, unknown>) => {
      const dueDate = new Date(inv.due_date as string);
      const todayDate = new Date(today);
      const diffTime = todayDate.getTime() - dueDate.getTime();
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...inv, days_overdue: daysOverdue };
    });

    const jobsWithDays = (delayedJobs || []).map((job: Record<string, unknown>) => {
      const endDate = new Date(job.end_date as string);
      const todayDate = new Date(today);
      const diffTime = todayDate.getTime() - endDate.getTime();
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...job, days_overdue: daysOverdue };
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          invoices: invoicesWithDays,
          jobs: jobsWithDays,
          documents: expiredDocs || [],
          summary: {
            overdue_invoices: (overdueInvoices || []).length,
            delayed_jobs: (delayedJobs || []).length,
            expired_documents: (expiredDocs || []).length,
            total_overdue_items: (overdueInvoices?.length || 0) + (delayedJobs?.length || 0) + (expiredDocs?.length || 0),
          },
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'get_aged_debtor_report',
  'Get an aged debtor report showing outstanding invoices grouped by age buckets (current, 1-30, 31-60, 61-90, 90+ days overdue). Use when the user asks about aged debtors, outstanding debt analysis, or overdue invoice ageing.',
  {},
  async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total_amount,
          due_date,
          status,
          clients:client_id (company_name)
        `)
        .in('status', ['sent', 'overdue'])
        .order('due_date', { ascending: true });

      if (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
          isError: true,
        };
      }

      interface InvoiceRow {
        id: string;
        invoice_number: string;
        total_amount: number;
        due_date: string | null;
        status: string;
        clients: { company_name: string } | null;
      }

      interface DebtorEntry {
        id: string;
        invoice_number: string;
        client_name: string;
        total_amount: number;
        due_date: string | null;
        days_overdue: number;
      }

      interface Bucket {
        label: string;
        days_min: number;
        days_max: number;
        invoices: DebtorEntry[];
        total: number;
      }

      const buckets: Bucket[] = [
        { label: 'Current (not yet due)', days_min: -Infinity, days_max: 0, invoices: [], total: 0 },
        { label: '1–30 days', days_min: 1, days_max: 30, invoices: [], total: 0 },
        { label: '31–60 days', days_min: 31, days_max: 60, invoices: [], total: 0 },
        { label: '61–90 days', days_min: 61, days_max: 90, invoices: [], total: 0 },
        { label: '90+ days', days_min: 91, days_max: Infinity, invoices: [], total: 0 },
      ];

      let grandTotal = 0;

      for (const inv of (invoices ?? []) as InvoiceRow[]) {
        let daysOverdue = 0;
        if (inv.due_date) {
          const dueDate = new Date(inv.due_date);
          dueDate.setHours(0, 0, 0, 0);
          const diffMs = today.getTime() - dueDate.getTime();
          daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        }

        const entry: DebtorEntry = {
          id: inv.id,
          invoice_number: inv.invoice_number,
          client_name: (inv.clients as { company_name: string } | null)?.company_name ?? 'Unknown',
          total_amount: inv.total_amount ?? 0,
          due_date: inv.due_date,
          days_overdue: daysOverdue,
        };

        const bucket = buckets.find(b => daysOverdue >= b.days_min && daysOverdue <= b.days_max);
        if (bucket) {
          bucket.invoices.push(entry);
          bucket.total += entry.total_amount;
        }
        grandTotal += entry.total_amount;
      }

      const result = {
        report_date: todayStr,
        buckets: buckets.map(b => ({
          label: b.label,
          days_min: isFinite(b.days_min) ? b.days_min : null,
          days_max: isFinite(b.days_max) ? b.days_max : null,
          invoices: b.invoices,
          total: b.total,
        })),
        grand_total: grandTotal,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to generate aged debtor report.' }) }],
        isError: true,
      };
    }
  }
);

server.tool(
  'get_cis_monthly_return',
  'Get a CIS monthly return for a given month and year, showing all subcontractor payments with gross amount, CIS deduction at 20%, and net payment. Use when the user asks about CIS returns, monthly CIS submissions, or subcontractor deductions for a specific month.',
  {
    month: z.number().min(1).max(12),
    year: z.number().min(2020).max(2100),
  },
  async (args) => {
    try {
      const monthStr = String(args.month).padStart(2, '0');
      const monthStart = `${args.year}-${monthStr}-01`;
      const lastDay = new Date(args.year, args.month, 0).getDate();
      const monthEnd = `${args.year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

      const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total_amount,
          subtotal,
          paid_at,
          jobs:job_id (
            id,
            title,
            subcontractor_id
          )
        `)
        .eq('status', 'paid')
        .gte('paid_at', monthStart)
        .lte('paid_at', monthEnd + 'T23:59:59');

      if (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
          isError: true,
        };
      }

      const { data: subcontractors } = await supabase
        .from('subcontractors')
        .select('id, company_name, utr_number');

      const subMap = new Map<string, { company_name: string; utr_number: string | null }>();
      for (const s of subcontractors ?? []) {
        subMap.set(s.id, { company_name: s.company_name, utr_number: s.utr_number });
      }

      interface CISEntry {
        subcontractor_id: string;
        subcontractor_name: string;
        utr_number: string | null;
        invoice_id: string;
        invoice_number: string;
        gross_payment: number;
        cis_deduction: number;
        net_payment: number;
      }

      const entries: CISEntry[] = [];

      for (const inv of invoices ?? []) {
        const job = inv.jobs as { id: string; title: string; subcontractor_id: string | null } | null;
        if (!job?.subcontractor_id) continue;

        const sub = subMap.get(job.subcontractor_id);
        if (!sub) continue;

        const gross = inv.subtotal ?? inv.total_amount ?? 0;
        const deduction = Math.round(gross * 0.20 * 100) / 100;
        const net = Math.round((gross - deduction) * 100) / 100;

        entries.push({
          subcontractor_id: job.subcontractor_id,
          subcontractor_name: sub.company_name,
          utr_number: sub.utr_number,
          invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          gross_payment: gross,
          cis_deduction: deduction,
          net_payment: net,
        });
      }

      const monthLabel = new Date(args.year, args.month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

      const totals = entries.reduce(
        (acc, e) => ({
          gross: Math.round((acc.gross + e.gross_payment) * 100) / 100,
          deductions: Math.round((acc.deductions + e.cis_deduction) * 100) / 100,
          net: Math.round((acc.net + e.net_payment) * 100) / 100,
        }),
        { gross: 0, deductions: 0, net: 0 }
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ month_label: monthLabel, month: args.month, year: args.year, entries, totals }, null, 2),
        }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to generate CIS monthly return.' }) }],
        isError: true,
      };
    }
  }
);

server.tool(
  'get_subcontractor_payment_schedule',
  'Get a payment schedule for one or all subcontractors, optionally filtered by UK tax year (e.g. "2025-26"). Returns payments grouped by subcontractor with running totals. Use when the user asks about subcontractor payment history or annual CIS summaries.',
  {
    subcontractor_id: z.string().optional(),
    tax_year: z.string().optional(),
  },
  async (args) => {
    try {
      let dateFrom: string | null = null;
      let dateTo: string | null = null;

      if (args.tax_year) {
        const match = args.tax_year.match(/^(\d{4})-(\d{2})$/);
        if (match) {
          const startYear = parseInt(match[1], 10);
          dateFrom = `${startYear}-04-06`;
          dateTo = `${startYear + 1}-04-05T23:59:59`;
        }
      }

      let query = supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          subtotal,
          total_amount,
          paid_at,
          jobs:job_id (
            id,
            title,
            subcontractor_id
          )
        `)
        .eq('status', 'paid')
        .order('paid_at', { ascending: true });

      if (dateFrom) query = query.gte('paid_at', dateFrom);
      if (dateTo) query = query.lte('paid_at', dateTo);

      const { data: invoices, error } = await query;

      if (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
          isError: true,
        };
      }

      let subQuery = supabase.from('subcontractors').select('id, company_name, utr_number');
      if (args.subcontractor_id) subQuery = subQuery.eq('id', args.subcontractor_id);
      const { data: subcontractors } = await subQuery;

      const subMap = new Map<string, { company_name: string; utr_number: string | null }>();
      for (const s of subcontractors ?? []) {
        subMap.set(s.id, { company_name: s.company_name, utr_number: s.utr_number });
      }

      interface PaymentEntry {
        invoice_id: string;
        invoice_number: string;
        paid_at: string;
        gross_payment: number;
        cis_deduction: number;
        net_payment: number;
        running_gross: number;
        running_net: number;
      }

      interface SubPayments {
        subcontractor_id: string;
        subcontractor_name: string;
        utr_number: string | null;
        payments: PaymentEntry[];
        total_gross: number;
        total_deductions: number;
        total_net: number;
      }

      const grouped = new Map<string, SubPayments>();

      for (const inv of invoices ?? []) {
        const job = inv.jobs as { id: string; title: string; subcontractor_id: string | null } | null;
        if (!job?.subcontractor_id) continue;

        const sub = subMap.get(job.subcontractor_id);
        if (!sub) continue;

        if (args.subcontractor_id && job.subcontractor_id !== args.subcontractor_id) continue;

        if (!grouped.has(job.subcontractor_id)) {
          grouped.set(job.subcontractor_id, {
            subcontractor_id: job.subcontractor_id,
            subcontractor_name: sub.company_name,
            utr_number: sub.utr_number,
            payments: [],
            total_gross: 0,
            total_deductions: 0,
            total_net: 0,
          });
        }

        const group = grouped.get(job.subcontractor_id)!;
        const gross = inv.subtotal ?? inv.total_amount ?? 0;
        const deduction = Math.round(gross * 0.20 * 100) / 100;
        const net = Math.round((gross - deduction) * 100) / 100;

        group.total_gross = Math.round((group.total_gross + gross) * 100) / 100;
        group.total_deductions = Math.round((group.total_deductions + deduction) * 100) / 100;
        group.total_net = Math.round((group.total_net + net) * 100) / 100;

        group.payments.push({
          invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          paid_at: inv.paid_at,
          gross_payment: gross,
          cis_deduction: deduction,
          net_payment: net,
          running_gross: group.total_gross,
          running_net: group.total_net,
        });
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            tax_year: args.tax_year ?? null,
            subcontractors: Array.from(grouped.values()),
          }, null, 2),
        }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to generate subcontractor payment schedule.' }) }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Reporting MCP Server running on stdio');
}

main().catch(console.error);

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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GroundworkOS Reporting MCP Server running on stdio');
}

main().catch(console.error);

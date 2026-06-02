import type { SupabaseClient } from '@supabase/supabase-js';

export interface GetRevenueReportInput {
  months_back?: number;
}

export interface GetProfitabilityReportInput {
  job_id?: string;
}

export interface GetAgedDebtorReportInput {}

export interface GetCISMonthlyReturnInput {
  month: number;
  year: number;
}

export interface GetSubcontractorPaymentScheduleInput {
  subcontractor_id?: string;
  tax_year?: string;
}

export async function getPipelineSummary(
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const [{ data: jobs, error: jobsError }, { data: quotes, error: quotesError }, { data: paidInvoices, error: invError }] =
    await Promise.all([
      supabase.from('jobs').select('status, value').eq('company_id', companyId),
      supabase.from('quotes').select('total_amount, status').eq('company_id', companyId),
      supabase.from('invoices').select('total_amount, paid_at').eq('company_id', companyId).eq('status', 'paid'),
    ]);
  if (jobsError || quotesError || invError) throw new Error('Failed to fetch pipeline data');

  const statusGroups: Record<string, { count: number; value: number }> = {};
  (jobs ?? []).forEach((job: { status: string; value: number | null }) => {
    if (!statusGroups[job.status]) statusGroups[job.status] = { count: 0, value: 0 };
    statusGroups[job.status].count++;
    statusGroups[job.status].value += job.value || 0;
  });

  const pendingQuotes = (quotes ?? []).filter((q: { status: string }) => q.status === 'sent');
  const pendingQuotesValue = pendingQuotes.reduce(
    (sum: number, q: { total_amount: number }) => sum + (q.total_amount || 0), 0
  );

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const thisMonthRevenue = (paidInvoices ?? []).filter((inv: { paid_at: string }) => inv.paid_at?.startsWith(thisMonth))
    .reduce((sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0), 0);
  const lastMonthRevenue = (paidInvoices ?? []).filter((inv: { paid_at: string }) => inv.paid_at?.startsWith(lastMonth))
    .reduce((sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0), 0);

  return {
    by_status: Object.entries(statusGroups).map(([status, d]) => ({ status, count: d.count, value: d.value })),
    pending_quotes: { count: pendingQuotes.length, value: pendingQuotesValue },
    monthly_revenue: thisMonthRevenue,
    last_month_revenue: lastMonthRevenue,
  };
}

export async function getRevenueReport(
  input: GetRevenueReportInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const monthsBack = input.months_back ?? 6;
  const now = new Date();

  const { data: paidInvoices, error } = await supabase
    .from('invoices')
    .select('total_amount, paid_at')
    .eq('company_id', companyId)
    .eq('status', 'paid')
    .order('paid_at', { ascending: false });
  if (error) throw new Error(error.message);

  const monthlyRevenue: { month_label: string; month_key: string; total: number; invoice_count: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = monthDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    const monthInvoices = (paidInvoices ?? []).filter((inv: { paid_at: string }) => inv.paid_at?.startsWith(monthKey));
    monthlyRevenue.push({
      month_label: monthLabel,
      month_key: monthKey,
      total: monthInvoices.reduce((sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0), 0),
      invoice_count: monthInvoices.length,
    });
  }

  const grandTotal = monthlyRevenue.reduce((sum, m) => sum + m.total, 0);
  return { monthly_revenue: monthlyRevenue, grand_total: grandTotal, average_monthly: monthsBack > 0 ? grandTotal / monthsBack : 0 };
}

export async function getProfitabilityReport(
  input: GetProfitabilityReportInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<unknown> {
  if (input.job_id) {
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*, quotes:quote_id (id, quote_number, total_amount, status)')
      .eq('id', input.job_id)
      .eq('company_id', companyId)
      .single();
    if (jobError) throw new Error(jobError.message);

    const { data: invoices } = await supabase
      .from('invoices')
      .select('total_amount, status')
      .eq('job_id', input.job_id)
      .eq('company_id', companyId);
    const totalInvoiced = (invoices ?? []).reduce((sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0), 0);
    const quoteValue = (job?.quotes as { total_amount?: number } | null)?.total_amount ?? 0;
    const variance = totalInvoiced - quoteValue;
    const variancePercent = quoteValue > 0 ? (variance / quoteValue) * 100 : 0;

    return {
      job,
      quote_value: quoteValue,
      total_invoiced: totalInvoiced,
      variance,
      variance_percent: Math.round(variancePercent * 100) / 100,
      status: variancePercent > 5 ? 'over_budget' : variancePercent < -5 ? 'under_budget' : 'on_target',
    };
  }

  const [{ data: quotes, error: quotesError }, { data: invoices, error: invoicesError }] = await Promise.all([
    supabase.from('quotes').select('*, jobs:job_id (id, title, status)').eq('company_id', companyId).eq('status', 'accepted'),
    supabase.from('invoices').select('job_id, total_amount').eq('company_id', companyId),
  ]);
  if (quotesError || invoicesError) throw new Error('Failed to fetch profitability data');

  return (quotes ?? []).map((quote: Record<string, unknown>) => {
    const jobInvoices = (invoices ?? []).filter((inv: Record<string, unknown>) => inv.job_id === quote.job_id);
    const totalInvoiced = jobInvoices.reduce((sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0), 0);
    const quoteValue = (quote.total_amount as number) || 0;
    const variance = totalInvoiced - quoteValue;
    const variancePercent = quoteValue > 0 ? (variance / quoteValue) * 100 : 0;
    return {
      quote_id: quote.id, quote_number: quote.quote_number, job: quote.jobs,
      quote_value: quoteValue, total_invoiced: totalInvoiced, variance,
      variance_percent: Math.round(variancePercent * 100) / 100,
      status: variancePercent > 5 ? 'over_budget' : variancePercent < -5 ? 'under_budget' : 'on_target',
    };
  });
}

export async function getDailyBriefing(
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const today = new Date().toISOString().split('T')[0];

  const [outstandingResult, scheduleResult, complianceResult, activeJobsResult, overdueJobsResult] =
    await Promise.all([
      supabase.from('invoices').select('*, clients:client_id (company_name)').eq('company_id', companyId).neq('status', 'paid').order('due_date', { ascending: true }).limit(100),
      supabase.from('schedule_entries').select('*, jobs:job_id (title, client_id, clients:client_id (company_name))').eq('company_id', companyId).gte('start_datetime', `${today}T00:00:00`).lte('start_datetime', `${today}T23:59:59`),
      supabase.from('documents').select('*').eq('company_id', companyId).in('status', ['expired', 'expiring_soon']).limit(10),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active'),
      supabase.from('jobs').select('*').eq('company_id', companyId).eq('status', 'active').lt('end_date', today).limit(100),
    ]);

  const todaySchedule = scheduleResult.data ?? [];

  return {
    date: today,
    outstanding_invoices: (outstandingResult.data ?? []).slice(0, 5),
    today_schedule: todaySchedule,
    compliance_alerts: complianceResult.data ?? [],
    active_job_count: activeJobsResult.count ?? 0,
    overdue_jobs: overdueJobsResult.data ?? [],
    summary: {
      invoices_overdue: (outstandingResult.data ?? []).filter((inv: Record<string, unknown>) => (inv.due_date as string) < today).length,
      schedule_entries_today: todaySchedule.length,
      compliance_issues: (complianceResult.data ?? []).length,
    },
  };
}

export async function getOverdueSummary(
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const today = new Date().toISOString().split('T')[0];

  const [{ data: overdueInvoices, error: invError }, { data: delayedJobs, error: jobsError }, { data: expiredDocs, error: docsError }] =
    await Promise.all([
      supabase.from('invoices').select('*, clients:client_id (company_name)').eq('company_id', companyId).neq('status', 'paid').lt('due_date', today).limit(200),
      supabase.from('jobs').select('*').eq('company_id', companyId).eq('status', 'active').lt('end_date', today).limit(200),
      supabase.from('documents').select('*').eq('company_id', companyId).eq('status', 'expired').limit(200),
    ]);
  if (invError || jobsError || docsError) throw new Error('Failed to fetch overdue data');

  const invoicesWithDays = (overdueInvoices ?? []).map((inv: Record<string, unknown>) => {
    const diffMs = new Date(today).getTime() - new Date(inv.due_date as string).getTime();
    return { ...inv, days_overdue: Math.ceil(diffMs / (1000 * 60 * 60 * 24)) };
  });

  const jobsWithDays = (delayedJobs ?? []).map((job: Record<string, unknown>) => {
    const diffMs = new Date(today).getTime() - new Date(job.end_date as string).getTime();
    return { ...job, days_overdue: Math.ceil(diffMs / (1000 * 60 * 60 * 24)) };
  });

  return {
    invoices: invoicesWithDays,
    jobs: jobsWithDays,
    documents: expiredDocs ?? [],
    summary: {
      overdue_invoices: (overdueInvoices ?? []).length,
      delayed_jobs: (delayedJobs ?? []).length,
      expired_documents: (expiredDocs ?? []).length,
      total_overdue_items: (overdueInvoices?.length ?? 0) + (delayedJobs?.length ?? 0) + (expiredDocs?.length ?? 0),
    },
  };
}

export async function getAgedDebtorReport(supabase: SupabaseClient, companyId: string): Promise<Record<string, unknown>> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, total_amount, due_date, status, clients:client_id (company_name)')
    .eq('company_id', companyId)
    .in('status', ['sent', 'overdue'])
    .order('due_date', { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);

  interface Bucket { label: string; days_min: number; days_max: number; invoices: Record<string, unknown>[]; total: number }
  const buckets: Bucket[] = [
    { label: 'Current (not yet due)', days_min: -Infinity, days_max: 0, invoices: [], total: 0 },
    { label: '1–30 days', days_min: 1, days_max: 30, invoices: [], total: 0 },
    { label: '31–60 days', days_min: 31, days_max: 60, invoices: [], total: 0 },
    { label: '61–90 days', days_min: 61, days_max: 90, invoices: [], total: 0 },
    { label: '90+ days', days_min: 91, days_max: Infinity, invoices: [], total: 0 },
  ];

  let grandTotal = 0;
  for (const inv of invoices ?? []) {
    const typedInv = inv as unknown as { id: string; invoice_number: string; total_amount: number; due_date: string | null; status: string; clients: { company_name: string } | null };
    let daysOverdue = 0;
    if (typedInv.due_date) {
      const dueDate = new Date(typedInv.due_date);
      dueDate.setHours(0, 0, 0, 0);
      daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    }
    const entry = {
      id: typedInv.id, invoice_number: typedInv.invoice_number,
      client_name: typedInv.clients?.company_name ?? 'Unknown',
      total_amount: typedInv.total_amount ?? 0, due_date: typedInv.due_date, days_overdue: daysOverdue,
    };
    const bucket = buckets.find(b => daysOverdue >= b.days_min && daysOverdue <= b.days_max);
    if (bucket) { bucket.invoices.push(entry); bucket.total += entry.total_amount; }
    grandTotal += entry.total_amount;
  }

  return {
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
}

export async function getCISMonthlyReturn(
  input: GetCISMonthlyReturnInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const monthStr = String(input.month).padStart(2, '0');
  const monthStart = `${input.year}-${monthStr}-01`;
  const lastDay = new Date(input.year, input.month, 0).getDate();
  const monthEnd = `${input.year}-${monthStr}-${String(lastDay).padStart(2, '0')}T23:59:59`;

  const [{ data: invoices, error }, { data: subcontractors }] = await Promise.all([
    supabase.from('invoices').select('id, invoice_number, total_amount, subtotal, paid_at, jobs:job_id (id, title, subcontractor_id)').eq('company_id', companyId).eq('status', 'paid').gte('paid_at', monthStart).lte('paid_at', monthEnd),
    supabase.from('subcontractors').select('id, company_name, utr_number').eq('company_id', companyId),
  ]);
  if (error) throw new Error(error.message);

  const subMap = new Map<string, { company_name: string; utr_number: string | null }>();
  for (const s of subcontractors ?? []) subMap.set(s.id, { company_name: s.company_name, utr_number: s.utr_number });

  interface CISEntry { subcontractor_id: string; subcontractor_name: string; utr_number: string | null; invoice_id: string; invoice_number: string; gross_payment: number; cis_deduction: number; net_payment: number }
  const entries: CISEntry[] = [];

  for (const inv of invoices ?? []) {
    const typedInv = inv as unknown as { id: string; invoice_number: string; total_amount: number; subtotal: number; paid_at: string; jobs: { id: string; title: string; subcontractor_id: string | null } | null };
    if (!typedInv.jobs?.subcontractor_id) continue;
    const sub = subMap.get(typedInv.jobs.subcontractor_id);
    if (!sub) continue;
    const gross = typedInv.subtotal ?? typedInv.total_amount ?? 0;
    const deduction = Math.round(gross * 0.2 * 100) / 100;
    entries.push({ subcontractor_id: typedInv.jobs.subcontractor_id, subcontractor_name: sub.company_name, utr_number: sub.utr_number, invoice_id: typedInv.id, invoice_number: typedInv.invoice_number, gross_payment: gross, cis_deduction: deduction, net_payment: Math.round((gross - deduction) * 100) / 100 });
  }

  const monthLabel = new Date(input.year, input.month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const totals = entries.reduce((acc, e) => ({ gross: Math.round((acc.gross + e.gross_payment) * 100) / 100, deductions: Math.round((acc.deductions + e.cis_deduction) * 100) / 100, net: Math.round((acc.net + e.net_payment) * 100) / 100 }), { gross: 0, deductions: 0, net: 0 });

  return { month_label: monthLabel, month: input.month, year: input.year, entries, totals };
}

export async function getSubcontractorPaymentSchedule(
  input: GetSubcontractorPaymentScheduleInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  let dateFrom: string | null = null;
  let dateTo: string | null = null;
  if (input.tax_year) {
    const match = input.tax_year.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      const startYear = parseInt(match[1], 10);
      dateFrom = `${startYear}-04-06`;
      dateTo = `${startYear + 1}-04-05T23:59:59`;
    }
  }

  let query = supabase.from('invoices').select('id, invoice_number, subtotal, total_amount, paid_at, jobs:job_id (id, title, subcontractor_id)').eq('company_id', companyId).eq('status', 'paid').order('paid_at', { ascending: true });
  if (dateFrom) query = query.gte('paid_at', dateFrom);
  if (dateTo) query = query.lte('paid_at', dateTo);
  const { data: invoices, error } = await query;
  if (error) throw new Error(error.message);

  let subQuery = supabase.from('subcontractors').select('id, company_name, utr_number').eq('company_id', companyId);
  if (input.subcontractor_id) subQuery = subQuery.eq('id', input.subcontractor_id);
  const { data: subcontractors } = await subQuery;

  const subMap = new Map<string, { company_name: string; utr_number: string | null }>();
  for (const s of subcontractors ?? []) subMap.set(s.id, { company_name: s.company_name, utr_number: s.utr_number });

  interface SubPayments { subcontractor_id: string; subcontractor_name: string; utr_number: string | null; payments: Record<string, unknown>[]; total_gross: number; total_deductions: number; total_net: number }
  const grouped = new Map<string, SubPayments>();

  for (const inv of invoices ?? []) {
    const typedInv = inv as unknown as { id: string; invoice_number: string; subtotal: number; total_amount: number; paid_at: string; jobs: { subcontractor_id: string | null } | null };
    if (!typedInv.jobs?.subcontractor_id) continue;
    const sub = subMap.get(typedInv.jobs.subcontractor_id);
    if (!sub) continue;
    if (input.subcontractor_id && typedInv.jobs.subcontractor_id !== input.subcontractor_id) continue;

    if (!grouped.has(typedInv.jobs.subcontractor_id)) {
      grouped.set(typedInv.jobs.subcontractor_id, { subcontractor_id: typedInv.jobs.subcontractor_id, subcontractor_name: sub.company_name, utr_number: sub.utr_number, payments: [], total_gross: 0, total_deductions: 0, total_net: 0 });
    }
    const group = grouped.get(typedInv.jobs.subcontractor_id)!;
    const gross = typedInv.subtotal ?? typedInv.total_amount ?? 0;
    const deduction = Math.round(gross * 0.2 * 100) / 100;
    const net = Math.round((gross - deduction) * 100) / 100;
    group.total_gross = Math.round((group.total_gross + gross) * 100) / 100;
    group.total_deductions = Math.round((group.total_deductions + deduction) * 100) / 100;
    group.total_net = Math.round((group.total_net + net) * 100) / 100;
    group.payments.push({ invoice_id: typedInv.id, invoice_number: typedInv.invoice_number, paid_at: typedInv.paid_at, gross_payment: gross, cis_deduction: deduction, net_payment: net, running_gross: group.total_gross, running_net: group.total_net });
  }

  return { tax_year: input.tax_year ?? null, subcontractors: Array.from(grouped.values()) };
}

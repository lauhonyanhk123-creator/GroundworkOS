import type { SupabaseClient } from '@supabase/supabase-js';

export interface CreateInvoiceInput {
  client_id: string;
  job_id?: string;
  quote_id?: string;
  subtotal: number;
  due_date: string;
  notes?: string;
}

export interface MarkInvoicePaidInput {
  invoice_id: string;
}

export interface GetInvoiceSummaryInput {
  months_back?: number;
}

export interface SendInvoiceInput {
  invoice_id: string;
}

export async function createInvoice(
  input: CreateInvoiceInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const { data: invNumData, error: rpcError } = await supabase.rpc('generate_invoice_number');
  if (rpcError || !invNumData) throw new Error('Failed to generate invoice number.');

  const vatAmount = Math.round(input.subtotal * 0.2 * 100) / 100;
  const totalAmount = Math.round((input.subtotal + vatAmount) * 100) / 100;

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      company_id: companyId,
      invoice_number: invNumData as string,
      client_id: input.client_id,
      job_id: input.job_id ?? null,
      quote_id: input.quote_id ?? null,
      subtotal: input.subtotal,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      status: 'draft',
      due_date: input.due_date,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function markInvoicePaid(
  input: MarkInvoicePaidInput,
  supabase: SupabaseClient
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', input.invoice_id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function getOutstandingInvoices(
  supabase: SupabaseClient,
  companyId: string | null
): Promise<Record<string, unknown>[]> {
  const today = new Date().toISOString().split('T')[0];
  let query = supabase
    .from('invoices')
    .select('*, clients:client_id (id, company_name, contact_name)')
    .neq('status', 'paid')
    .order('due_date', { ascending: true });
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((inv: { due_date: string; total_amount: number }) => {
    const dueDate = new Date(inv.due_date);
    const todayDate = new Date(today);
    const daysOverdue = Math.ceil((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return { ...inv, days_overdue: daysOverdue > 0 ? daysOverdue : 0, is_overdue: daysOverdue > 0 };
  }) as Record<string, unknown>[];
}

export async function getInvoiceSummary(
  input: GetInvoiceSummaryInput,
  supabase: SupabaseClient,
  companyId: string | null
): Promise<Record<string, unknown>> {
  const monthsBack = input.months_back ?? 6;
  const now = new Date();

  let paidQuery = supabase.from('invoices').select('total_amount, paid_at').eq('status', 'paid');
  let outstandingQuery = supabase.from('invoices').select('total_amount, status, due_date').neq('status', 'paid');
  if (companyId) {
    paidQuery = paidQuery.eq('company_id', companyId);
    outstandingQuery = outstandingQuery.eq('company_id', companyId);
  }

  const [paidResult, outstandingResult] = await Promise.all([paidQuery, outstandingQuery]);

  const monthlyRevenue: { month: string; total: number; invoice_count: number }[] = [];
  for (let i = 0; i < monthsBack; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = monthDate.toISOString().slice(0, 7);
    const monthLabel = monthDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    const monthInvoices = (paidResult.data ?? []).filter(
      (inv: { paid_at: string }) => inv.paid_at?.startsWith(monthKey)
    );
    monthlyRevenue.push({
      month: monthLabel,
      total: monthInvoices.reduce((sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0), 0),
      invoice_count: monthInvoices.length,
    });
  }

  const totalOutstanding = (outstandingResult.data ?? []).reduce(
    (sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0),
    0
  );
  const overdueCount = (outstandingResult.data ?? []).filter(
    (inv: { due_date: string }) => inv.due_date && new Date(inv.due_date) < now
  ).length;

  return {
    monthly_revenue: monthlyRevenue.reverse(),
    total_outstanding: totalOutstanding,
    overdue_count: overdueCount,
  };
}

export async function sendInvoice(
  input: SendInvoiceInput,
  supabase: SupabaseClient
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'sent' })
    .eq('id', input.invoice_id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

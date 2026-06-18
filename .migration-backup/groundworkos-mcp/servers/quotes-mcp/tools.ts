import type { SupabaseClient } from '@supabase/supabase-js';
import { buildRateBook, searchRateBook, type RateBookSourceQuote } from './rate-book';

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

function calcTotals(lineItems: LineItem[]): { subtotal: number; vat_amount: number; total_amount: number } {
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const vat_amount = Math.round(subtotal * 0.2 * 100) / 100;
  const total_amount = Math.round((subtotal + vat_amount) * 100) / 100;
  return { subtotal, vat_amount, total_amount };
}

export interface CreateQuoteInput {
  client_id: string;
  title: string;
  line_items: LineItem[];
  notes?: string;
  job_id?: string;
}

export interface UpdateQuoteInput {
  quote_id: string;
  line_items?: LineItem[];
  notes?: string;
}

export interface DeleteQuoteInput {
  quote_id: string;
}

export interface SendQuoteInput {
  quote_id: string;
}

export interface AcceptQuoteInput {
  quote_id: string;
}

export interface ConvertQuoteToJobInput {
  quote_id: string;
}

export interface ListQuotesInput {
  status?: string;
}

export async function createQuote(
  input: CreateQuoteInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const { data: quoteNumData, error: rpcError } = await supabase.rpc('generate_quote_number');
  if (rpcError || !quoteNumData) throw new Error('Failed to generate quote number.');

  const lineItemsWithTotals = input.line_items.map(item => ({
    ...item,
    total: item.quantity * item.unit_price,
  }));
  const totals = calcTotals(input.line_items);

  const { data, error } = await supabase
    .from('quotes')
    .insert({
      company_id: companyId,
      quote_number: quoteNumData as string,
      client_id: input.client_id,
      job_id: input.job_id ?? null,
      title: input.title,
      line_items: lineItemsWithTotals,
      subtotal: totals.subtotal,
      vat_amount: totals.vat_amount,
      total_amount: totals.total_amount,
      status: 'draft',
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function updateQuote(
  input: UpdateQuoteInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const { data: existing, error: fetchError } = await supabase
    .from('quotes')
    .select('status')
    .eq('id', input.quote_id)
    .eq('company_id', companyId)
    .single();
  if (fetchError || !existing) throw new Error('Quote not found.');
  // Accepted/rejected quotes are decided outcomes that feed the rate book's
  // win/loss data — editing them would rewrite pricing history.
  if (existing.status === 'accepted' || existing.status === 'rejected') {
    throw new Error('A decided quote cannot be edited. Create a new quote instead.');
  }

  const updates: Record<string, unknown> = {};
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.line_items) {
    const lineItemsWithTotals = input.line_items.map(item => ({
      ...item,
      total: item.quantity * item.unit_price,
    }));
    const totals = calcTotals(input.line_items);
    updates.line_items = lineItemsWithTotals;
    updates.subtotal = totals.subtotal;
    updates.vat_amount = totals.vat_amount;
    updates.total_amount = totals.total_amount;
  }
  if (Object.keys(updates).length === 0) {
    throw new Error('No fields to update were provided.');
  }
  const { data, error } = await supabase
    .from('quotes')
    .update(updates)
    .eq('id', input.quote_id)
    .eq('company_id', companyId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function deleteQuote(
  input: DeleteQuoteInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  if (!input.quote_id) throw new Error('quote_id is required.');

  const { data: existing, error: fetchError } = await supabase
    .from('quotes')
    .select('status, quote_number')
    .eq('id', input.quote_id)
    .eq('company_id', companyId)
    .single();
  if (fetchError || !existing) throw new Error('Quote not found.');
  if (existing.status !== 'draft') {
    throw new Error('Only draft quotes can be deleted. Sent and decided quotes are kept for history.');
  }

  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', input.quote_id)
    .eq('company_id', companyId);
  if (error) throw new Error(error.message);

  return { deleted: true, quote_id: input.quote_id, quote_number: existing.quote_number };
}

export async function sendQuote(
  input: SendQuoteInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('quotes')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', input.quote_id)
    .eq('company_id', companyId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function acceptQuote(
  input: AcceptQuoteInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('quotes')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', input.quote_id)
    .eq('company_id', companyId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function convertQuoteToJob(
  input: ConvertQuoteToJobInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', input.quote_id)
    .eq('company_id', companyId)
    .single();
  if (quoteError || !quote) throw new Error('Quote not found.');
  if (quote.status !== 'accepted') throw new Error('Quote must be accepted before converting to a job.');

  const { data: jobNumData, error: rpcError } = await supabase.rpc('generate_job_number');
  if (rpcError || !jobNumData) throw new Error('Failed to generate job number.');

  const { data: newJob, error: jobError } = await supabase
    .from('jobs')
    .insert({
      company_id: companyId,
      job_number: jobNumData as string,
      client_id: quote.client_id,
      title: quote.title || 'New Job from Quote',
      description: `Created from quote ${quote.quote_number as string}`,
      value: quote.total_amount,
      status: 'active',
      progress_percent: 0,
    })
    .select()
    .single();
  if (jobError || !newJob) throw new Error(jobError?.message ?? 'Failed to create job.');

  const { error: linkError } = await supabase
    .from('quotes')
    .update({ job_id: newJob.id })
    .eq('id', input.quote_id)
    .eq('company_id', companyId);
  if (linkError) console.error('[quotes.convertQuoteToJob] Failed to link quote to job:', linkError);

  return { job: newJob, quote_id: input.quote_id };
}

export async function listQuotes(
  input: ListQuotesInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>[]> {
  let query = supabase
    .from('quotes')
    .select('*, clients:client_id (id, company_name, contact_name)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (input.status) query = query.eq('status', input.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export interface GetRateBookInput {
  search?: string;
  limit?: number;
}

export async function getRateBook(
  input: GetRateBookInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  // The most recent 1000 quotes are more than enough history to price from
  // while keeping the aggregation bounded.
  const { data, error } = await supabase
    .from('quotes')
    .select('status, created_at, line_items')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);

  const quotes = (data ?? []) as RateBookSourceQuote[];
  let entries = buildRateBook(quotes);
  if (typeof input.search === 'string' && input.search.trim()) {
    entries = searchRateBook(entries, input.search);
  }

  const limit = typeof input.limit === 'number' && Number.isFinite(input.limit)
    ? Math.min(Math.max(Math.floor(input.limit), 1), 200)
    : 50;

  return {
    quotes_analysed: quotes.length,
    total_items: entries.length,
    entries: entries.slice(0, limit),
  };
}

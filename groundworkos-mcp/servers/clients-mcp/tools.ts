import type { SupabaseClient } from '@supabase/supabase-js';

export interface CreateClientInput {
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  companies_house_number?: string;
  notes?: string;
}

export interface GetClientInput {
  client_id: string;
}

export interface SearchClientsInput {
  query: string;
}

export interface GetClientHistoryInput {
  client_id: string;
}

export interface UpdateClientInput {
  client_id: string;
  company_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  companies_house_number?: string;
  notes?: string;
}

export async function createClient(
  input: CreateClientInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('clients')
    .insert({
      company_name: input.company_name,
      contact_name: input.contact_name ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      companies_house_number: input.companies_house_number ?? null,
      notes: input.notes ?? null,
      company_id: companyId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function getClient(
  input: GetClientInput,
  supabase: SupabaseClient
): Promise<Record<string, unknown>> {
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', input.client_id)
    .single();
  if (clientError) throw new Error(clientError.message);

  const { count: jobCount } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', input.client_id);

  const { data: invoices } = await supabase
    .from('invoices')
    .select('total_amount')
    .eq('client_id', input.client_id)
    .eq('status', 'paid');

  const totalInvoiced = (invoices ?? []).reduce(
    (sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0),
    0
  );

  return { ...(client as object), job_count: jobCount ?? 0, total_invoiced: totalInvoiced };
}

export async function searchClients(
  input: SearchClientsInput,
  supabase: SupabaseClient,
  companyId: string | null
): Promise<Record<string, unknown>[]> {
  let query = supabase
    .from('clients')
    .select('*')
    .or(`company_name.ilike.%${input.query}%,contact_name.ilike.%${input.query}%`)
    .limit(10);
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export async function getClientHistory(
  input: GetClientHistoryInput,
  supabase: SupabaseClient
): Promise<Record<string, unknown>> {
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', input.client_id)
    .single();
  if (clientError) throw new Error(clientError.message);

  const [{ data: jobs }, { data: quotes }, { data: invoices }] = await Promise.all([
    supabase.from('jobs').select('*').eq('client_id', input.client_id).order('created_at', { ascending: false }),
    supabase.from('quotes').select('*').eq('client_id', input.client_id).order('created_at', { ascending: false }),
    supabase.from('invoices').select('*').eq('client_id', input.client_id).order('created_at', { ascending: false }),
  ]);

  return { client, jobs: jobs ?? [], quotes: quotes ?? [], invoices: invoices ?? [] };
}

export async function updateClient(
  input: UpdateClientInput,
  supabase: SupabaseClient
): Promise<Record<string, unknown>> {
  const { client_id, ...updates } = input;
  const cleanUpdates: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) cleanUpdates[key] = value;
  }
  const { data, error } = await supabase
    .from('clients')
    .update(cleanUpdates)
    .eq('id', client_id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

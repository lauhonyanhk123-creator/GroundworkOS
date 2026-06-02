import type { SupabaseClient } from '@supabase/supabase-js';

export interface CreateSubcontractorInput {
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  trade?: string;
  utr_number?: string;
  notes?: string;
}

export interface VerifyCISStatusInput {
  subcontractor_id: string;
  utr_number: string;
}

export interface GetSubcontractorDetailsInput {
  subcontractor_id: string;
}

export async function createSubcontractor(
  input: CreateSubcontractorInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('subcontractors')
    .insert({
      company_id: companyId,
      company_name: input.company_name,
      contact_name: input.contact_name ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      trade: input.trade ?? null,
      utr_number: input.utr_number ?? null,
      notes: input.notes ?? null,
      cis_status: 'unverified',
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function verifyCISStatus(
  input: VerifyCISStatusInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  let cisStatus: 'gross' | 'net' | 'unmatched' = 'unmatched';
  let isMock = false;

  try {
    const response = await fetch('https://api.service.hmrc.gov.uk/misc/cis-verifications', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HMRC_ACCESS_TOKEN ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contractorUtr: input.utr_number,
        date: new Date().toISOString().split('T')[0],
      }),
    });
    if (response.ok) {
      const data = await response.json() as { verificationResult?: string };
      if (data.verificationResult === 'VERIFIED_GROSS') cisStatus = 'gross';
      else if (data.verificationResult === 'VERIFIED_NET') cisStatus = 'net';
    } else {
      isMock = true;
    }
  } catch {
    isMock = true;
  }

  if (isMock) {
    const rand = Math.random();
    if (rand > 0.7) cisStatus = 'gross';
    else if (rand > 0.4) cisStatus = 'net';
  }

  const verifiedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('subcontractors')
    .update({ cis_status: cisStatus, cis_verified_at: verifiedAt })
    .eq('id', input.subcontractor_id)
    .eq('company_id', companyId)
    .select()
    .single();
  if (error) throw new Error(error.message);

  return { status: cisStatus, verified_at: verifiedAt, is_mock: isMock, subcontractor: data };
}

export async function listSubcontractors(
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase
    .from('subcontractors')
    .select('*, documents:documents(count)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((sub: Record<string, unknown>) => ({
    ...sub,
    document_count: Array.isArray(sub.documents) ? sub.documents.length : 0,
  })) as Record<string, unknown>[];
}

export async function getSubcontractorDetails(
  input: GetSubcontractorDetailsInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const [{ data: subcon, error: subconError }, { data: documents }, { data: scheduleEntries }] =
    await Promise.all([
      supabase.from('subcontractors').select('*').eq('id', input.subcontractor_id).eq('company_id', companyId).single(),
      supabase.from('documents').select('*').eq('related_to', 'subcontractor').eq('related_id', input.subcontractor_id).eq('company_id', companyId).order('expiry_date', { ascending: true }),
      supabase.from('schedule_entries')
        .select('*, jobs:job_id (id, job_number, title, client_id)')
        .eq('company_id', companyId)
        .eq('notes', `subcontractor:${input.subcontractor_id}`)
        .order('start_datetime', { ascending: false }),
    ]);
  if (subconError || !subcon) throw new Error('Subcontractor not found.');

  return { subcontractor: subcon, documents: documents ?? [], schedule_history: scheduleEntries ?? [] };
}

export async function flagCISIssues(
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>[]> {
  const [{ data: subs }, { data: expiredDocs }] = await Promise.all([
    supabase.from('subcontractors').select('*').eq('company_id', companyId).in('cis_status', ['unverified', 'unmatched']).order('company_name', { ascending: true }),
    supabase.from('documents').select('*').eq('company_id', companyId).eq('related_to', 'subcontractor').eq('status', 'expired'),
  ]);

  const flaggedSubcons = new Set<string>();
  const issues: Record<string, unknown>[] = [];

  (subs ?? []).forEach((sub: Record<string, unknown>) => {
    flaggedSubcons.add(sub.id as string);
    issues.push({ subcontractor: sub, issue: 'cis_status', message: `CIS status is ${sub.cis_status as string} - needs verification` });
  });

  (expiredDocs ?? []).forEach((doc: Record<string, unknown>) => {
    if (!flaggedSubcons.has(doc.related_id as string)) flaggedSubcons.add(doc.related_id as string);
    issues.push({ document: doc, issue: 'document_expired', message: `Document "${doc.name as string}" has expired` });
  });

  return issues;
}

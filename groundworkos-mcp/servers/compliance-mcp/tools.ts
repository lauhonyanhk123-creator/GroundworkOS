import type { SupabaseClient } from '@supabase/supabase-js';

export interface AddDocumentInput {
  name: string;
  type: string;
  related_to?: string;
  related_id?: string;
  file_path?: string;
  expiry_date?: string;
  notes?: string;
}

export interface UpdateDocumentInput {
  document_id: string;
  name?: string;
  type?: string;
  related_to?: string | null;
  related_id?: string | null;
  expiry_date?: string | null;
}

export interface DeleteDocumentInput {
  document_id: string;
}

export interface FlagExpiringDocumentsInput {
  days_ahead?: number;
}

export interface GetJobDocumentsInput {
  job_id: string;
}

export interface GetSubcontractorDocumentsInput {
  subcontractor_id: string;
}

export function deriveDocumentStatus(expiryDate: string | null): 'active' | 'expired' | 'expiring_soon' {
  if (!expiryDate) return 'active';
  const expiry = new Date(expiryDate);
  const today = new Date();
  const thirtyDays = new Date(today);
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  if (expiry < today) return 'expired';
  if (expiry < thirtyDays) return 'expiring_soon';
  return 'active';
}

export async function addDocument(
  input: AddDocumentInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      company_id: companyId,
      name: input.name,
      type: input.type,
      related_to: input.related_to ?? null,
      related_id: input.related_id ?? null,
      file_path: input.file_path ?? null,
      expiry_date: input.expiry_date ?? null,
      status: deriveDocumentStatus(input.expiry_date ?? null),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function checkComplianceStatus(
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const today = new Date();
  const thirtyDays = new Date(today);
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  const todayStr = today.toISOString().split('T')[0];
  const thirtyDaysStr = thirtyDays.toISOString().split('T')[0];

  const [{ data: expired, error: expiredError }, { data: expiringSoon, error: expiringError }, { data: valid, error: validError }] =
    await Promise.all([
      supabase.from('documents').select('*').eq('company_id', companyId).lt('expiry_date', todayStr),
      supabase.from('documents').select('*').eq('company_id', companyId).gte('expiry_date', todayStr).lte('expiry_date', thirtyDaysStr),
      supabase.from('documents').select('*').eq('company_id', companyId).gt('expiry_date', thirtyDaysStr),
    ]);

  if (expiredError || expiringError || validError) throw new Error('Failed to fetch compliance data');

  const expiredDocs = (expired ?? []) as Record<string, unknown>[];
  const expiringSoonDocs = (expiringSoon ?? []) as Record<string, unknown>[];
  const validDocs = (valid ?? []) as Record<string, unknown>[];

  // Update statuses in the background (fire-and-forget, scoped to this company).
  if (expiredDocs.length > 0) {
    const ids = expiredDocs.map(d => d.id);
    void supabase.from('documents').update({ status: 'expired' }).eq('company_id', companyId).in('id', ids)
      .then(({ error }) => { if (error) console.error('[compliance.checkComplianceStatus] Failed to mark expired:', error); });
  }
  if (expiringSoonDocs.length > 0) {
    const ids = expiringSoonDocs.map(d => d.id);
    void supabase.from('documents').update({ status: 'expiring_soon' }).eq('company_id', companyId).in('id', ids)
      .then(({ error }) => { if (error) console.error('[compliance.checkComplianceStatus] Failed to mark expiring soon:', error); });
  }

  const overallStatus = expiredDocs.length > 0 ? 'red' : expiringSoonDocs.length > 0 ? 'amber' : 'green';

  return {
    expired: expiredDocs,
    expiring_soon: expiringSoonDocs,
    valid: validDocs,
    overall_status: overallStatus,
    summary: {
      total: expiredDocs.length + expiringSoonDocs.length + validDocs.length,
      expired_count: expiredDocs.length,
      expiring_soon_count: expiringSoonDocs.length,
      valid_count: validDocs.length,
    },
  };
}

export async function updateDocument(
  input: UpdateDocumentInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  if (!input.document_id) throw new Error('document_id is required.');
  if (input.name !== undefined && !input.name.trim()) {
    throw new Error('Document name cannot be empty.');
  }

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.type !== undefined) updates.type = input.type;
  if (input.related_to !== undefined) updates.related_to = input.related_to;
  if (input.related_id !== undefined) updates.related_id = input.related_id;
  if (input.expiry_date !== undefined) {
    updates.expiry_date = input.expiry_date;
    updates.status = deriveDocumentStatus(input.expiry_date);
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No fields to update were provided.');
  }

  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', input.document_id)
    .eq('company_id', companyId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function deleteDocument(
  input: DeleteDocumentInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  if (!input.document_id) throw new Error('document_id is required.');

  const { data: existing, error: fetchError } = await supabase
    .from('documents')
    .select('id, name, file_path')
    .eq('id', input.document_id)
    .eq('company_id', companyId)
    .single();
  if (fetchError || !existing) throw new Error('Document not found.');

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', input.document_id)
    .eq('company_id', companyId);
  if (error) throw new Error(error.message);

  // The DB row is the source of truth; a failed storage removal just leaves
  // an orphaned file, so it is logged rather than failing the delete.
  if (existing.file_path) {
    const { error: storageError } = await supabase.storage
      .from('groundworkos-documents')
      .remove([existing.file_path as string]);
    if (storageError) {
      console.error('[compliance.deleteDocument] Failed to remove stored file:', storageError);
    }
  }

  return { deleted: true, document_id: input.document_id, name: existing.name };
}

export async function flagExpiringDocuments(
  input: FlagExpiringDocumentsInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const daysAhead = input.days_ahead ?? 30;
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const todayStr = today.toISOString().split('T')[0];
  const futureStr = futureDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('company_id', companyId)
    .gte('expiry_date', todayStr)
    .lte('expiry_date', futureStr)
    .order('expiry_date', { ascending: true });
  if (error) throw new Error(error.message);

  const withDaysUntil = (data ?? []).map((doc: Record<string, unknown>) => {
    const diffTime = new Date(doc.expiry_date as string).getTime() - today.getTime();
    return { ...doc, days_until_expiry: Math.ceil(diffTime / (1000 * 60 * 60 * 24)) };
  });

  return { days_ahead: daysAhead, documents: withDaysUntil };
}

export async function getJobDocuments(
  input: GetJobDocumentsInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('company_id', companyId)
    .eq('related_to', 'job')
    .eq('related_id', input.job_id)
    .order('expiry_date', { ascending: true });
  if (error) throw new Error(error.message);
  const docs = (data ?? []) as Record<string, unknown>[];

  return {
    documents: docs,
    summary: {
      total: docs.length,
      expired: docs.filter(d => d.status === 'expired').length,
      expiring_soon: docs.filter(d => d.status === 'expiring_soon').length,
    },
  };
}

export async function getSubcontractorDocuments(
  input: GetSubcontractorDocumentsInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('company_id', companyId)
    .eq('related_to', 'subcontractor')
    .eq('related_id', input.subcontractor_id)
    .order('expiry_date', { ascending: true });
  if (error) throw new Error(error.message);
  const docs = (data ?? []) as Record<string, unknown>[];

  const byType: Record<string, unknown[]> = { insurance: [], cscs: [], other: [] };
  docs.forEach(doc => {
    const type = doc.type as string;
    if (type === 'insurance' || type === 'cscs') (byType[type] as unknown[]).push(doc);
    else byType.other.push(doc);
  });

  return {
    documents: docs,
    by_type: byType,
    summary: { total: docs.length, insurance_count: byType.insurance.length, cscs_count: byType.cscs.length },
  };
}

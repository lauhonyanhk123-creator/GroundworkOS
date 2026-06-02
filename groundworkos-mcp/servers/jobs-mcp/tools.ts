import type { SupabaseClient } from '@supabase/supabase-js';

export interface CreateJobInput {
  client_id: string;
  title: string;
  description?: string;
  site_address?: string;
  type?: string;
  value?: number;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export interface UpdateJobStatusInput {
  job_id: string;
  status: string;
  notes?: string;
}

export interface UpdateJobProgressInput {
  job_id: string;
  progress_percent: number;
  notes?: string;
}

export interface GetJobDetailsInput {
  job_id: string;
}

export interface ListJobsInput {
  status?: string;
  client_id?: string;
  limit?: number;
}

export interface GetEntityHistoryInput {
  entity_type: 'job' | 'quote' | 'invoice';
  entity_id: string;
}

export async function createJob(
  input: CreateJobInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const { data: jobNumData, error: rpcError } = await supabase.rpc('generate_job_number');
  if (rpcError || !jobNumData) throw new Error('Failed to generate job number.');

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      company_id: companyId,
      job_number: jobNumData as string,
      client_id: input.client_id,
      title: input.title,
      description: input.description ?? null,
      site_address: input.site_address ?? null,
      type: input.type ?? null,
      value: input.value ?? null,
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      status: 'enquiry',
      progress_percent: 0,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function updateJobStatus(
  input: UpdateJobStatusInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const { data: existing, error: fetchError } = await supabase
    .from('jobs')
    .select('status, notes')
    .eq('id', input.job_id)
    .eq('company_id', companyId)
    .single();
  if (fetchError || !existing) throw new Error('Job not found.');

  const oldStatus = existing.status as string;
  let updatedNotes = (existing.notes as string) || '';
  if (input.notes) {
    updatedNotes += `\n[${new Date().toISOString()}] Status changed to ${input.status}: ${input.notes}`;
  }

  const { error: updateError } = await supabase
    .from('jobs')
    .update({ status: input.status, notes: updatedNotes.trim() || null })
    .eq('id', input.job_id)
    .eq('company_id', companyId);
  if (updateError) throw new Error(updateError.message);

  const { error: historyError } = await supabase.from('status_history').insert({
    company_id: companyId,
    entity_type: 'job',
    entity_id: input.job_id,
    old_status: oldStatus,
    new_status: input.status,
    notes: input.notes ?? null,
    created_by: null,
  });
  if (historyError) console.error('[jobs.updateJobStatus] Failed to log status history:', historyError);

  return { job_id: input.job_id, old_status: oldStatus, new_status: input.status };
}

export async function updateJobProgress(
  input: UpdateJobProgressInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const clamped = Math.max(0, Math.min(100, input.progress_percent));

  const { data: existing, error: fetchError } = await supabase
    .from('jobs')
    .select('notes')
    .eq('id', input.job_id)
    .eq('company_id', companyId)
    .single();
  if (fetchError || !existing) throw new Error('Job not found.');

  let updatedNotes = (existing.notes as string) || '';
  if (input.notes) {
    updatedNotes += `\n[${new Date().toISOString()}] Progress: ${clamped}% - ${input.notes}`;
  }

  const { data, error } = await supabase
    .from('jobs')
    .update({ progress_percent: clamped, notes: updatedNotes.trim() || null })
    .eq('id', input.job_id)
    .eq('company_id', companyId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function getJobDetails(
  input: GetJobDetailsInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', input.job_id)
    .eq('company_id', companyId)
    .single();
  if (jobError) throw new Error(jobError.message);

  const [{ data: client }, { data: schedule }, { data: documents }, { data: statusHistory }] =
    await Promise.all([
      supabase.from('clients').select('*').eq('id', job.client_id).eq('company_id', companyId).single(),
      supabase.from('schedule_entries').select('*').eq('job_id', input.job_id).eq('company_id', companyId).order('start_datetime', { ascending: true }),
      supabase.from('documents').select('*').eq('related_to', 'job').eq('related_id', input.job_id).eq('company_id', companyId),
      supabase.from('status_history').select('*').eq('entity_type', 'job').eq('entity_id', input.job_id).eq('company_id', companyId).order('created_at', { ascending: false }),
    ]);

  return {
    job,
    client,
    schedule: schedule ?? [],
    documents: documents ?? [],
    status_history: statusHistory ?? [],
  };
}

export async function listJobs(
  input: ListJobsInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>[]> {
  let query = supabase
    .from('jobs')
    .select('*, clients:client_id (id, company_name, contact_name)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(input.limit ?? 20);
  if (input.status) query = query.eq('status', input.status);
  if (input.client_id) query = query.eq('client_id', input.client_id);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export async function getJobSummaryStats(
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('status, value')
    .eq('company_id', companyId);
  if (error) throw new Error(error.message);

  const activeCount = (jobs ?? []).filter((j: { status: string }) => j.status === 'active').length;
  const quotedCount = (jobs ?? []).filter((j: { status: string }) => j.status === 'quoted').length;
  const completeCount = (jobs ?? []).filter((j: { status: string }) => j.status === 'complete').length;
  const totalPipelineValue = (jobs ?? []).reduce(
    (sum: number, j: { value: number | null }) => sum + (j.value || 0),
    0
  );

  return { active_count: activeCount, quoted_count: quotedCount, complete_count: completeCount, total_pipeline_value: totalPipelineValue };
}

export async function getEntityHistory(
  input: GetEntityHistoryInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase
    .from('status_history')
    .select('*')
    .eq('entity_type', input.entity_type)
    .eq('entity_id', input.entity_id)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

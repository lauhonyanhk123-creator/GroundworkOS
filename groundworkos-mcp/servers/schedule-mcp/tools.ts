import type { SupabaseClient } from '@supabase/supabase-js';

export interface CreateScheduleEntryInput {
  job_id?: string;
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  crew_count?: number;
  plant_assigned?: string;
  notes?: string;
}

export interface GetWeeklyScheduleInput {
  week_start_date: string;
}

export interface CheckAvailabilityInput {
  date: string;
  plant_name?: string;
}

export interface GetWeatherRiskInput {
  date: string;
  postcode?: string;
}

export interface GetScheduleOverviewInput {
  month?: number;
  year?: number;
}

export async function createScheduleEntry(
  input: CreateScheduleEntryInput,
  supabase: SupabaseClient,
  companyId: string
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('schedule_entries')
    .insert({
      company_id: companyId,
      job_id: input.job_id ?? null,
      title: input.title,
      description: input.description ?? null,
      start_datetime: input.start_datetime,
      end_datetime: input.end_datetime,
      crew_count: input.crew_count ?? 1,
      plant_assigned: input.plant_assigned ?? null,
      notes: input.notes ?? null,
    })
    .select('*, jobs:job_id (id, job_number, title, client_id, clients:client_id (id, company_name))')
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function getWeeklySchedule(
  input: GetWeeklyScheduleInput,
  supabase: SupabaseClient,
  companyId: string | null
): Promise<Record<string, unknown>> {
  const startDate = new Date(input.week_start_date);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);

  let query = supabase
    .from('schedule_entries')
    .select('*, jobs:job_id (id, job_number, title, client_id, clients:client_id (id, company_name))')
    .gte('start_datetime', startDate.toISOString())
    .lt('start_datetime', endDate.toISOString())
    .order('start_datetime', { ascending: true });
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const schedule: Record<string, unknown[]> = {};
  days.forEach(day => { schedule[day] = []; });

  (data ?? []).forEach((entry: Record<string, unknown>) => {
    const entryDate = new Date(entry.start_datetime as string);
    const dayIndex = entryDate.getDay();
    const dayName = days[dayIndex === 0 ? 6 : dayIndex - 1];
    (schedule[dayName] as unknown[]).push(entry);
  });

  return { week_start: input.week_start_date, schedule };
}

export async function checkAvailability(
  input: CheckAvailabilityInput,
  supabase: SupabaseClient,
  companyId: string | null
): Promise<Record<string, unknown>> {
  const startOfDay = new Date(input.date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(input.date);
  endOfDay.setHours(23, 59, 59, 999);

  let query = supabase
    .from('schedule_entries')
    .select('*, jobs:job_id (id, job_number, title)')
    .gte('start_datetime', startOfDay.toISOString())
    .lte('start_datetime', endOfDay.toISOString())
    .order('start_datetime', { ascending: true });
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const conflicts = (data ?? []) as Record<string, unknown>[];

  let plantConflicts: Record<string, unknown>[] = [];
  if (input.plant_name) {
    plantConflicts = conflicts.filter(entry => entry.plant_assigned === input.plant_name);
  }

  return {
    date: input.date,
    is_available: conflicts.length === 0 && plantConflicts.length === 0,
    total_conflicts: conflicts.length,
    plant_conflicts: plantConflicts.length,
    conflicts,
  };
}

export async function getWeatherRisk(input: GetWeatherRiskInput): Promise<Record<string, unknown>> {
  let temperature = 15;
  let windSpeed = 10;
  let precipitation = 0;
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  let description = 'Clear conditions expected';
  let isMock = true;

  try {
    const apiKey = process.env.MET_OFFICE_API_KEY;
    if (apiKey) {
      const response = await fetch(
        `https://data.hub.api.metoffice.gov.uk/sitespecific/v0/point/daily?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location: input.postcode ?? 'SW1A 1AA', forecastPeriod: 1 }),
        }
      );
      if (response.ok) {
        const data = await response.json() as {
          sites?: Array<{ periods?: Array<{ elements?: Array<{ type: string; value?: string }> }> }>
        };
        isMock = false;
        const elements = data.sites?.[0]?.periods?.[0]?.elements ?? [];
        elements.forEach((el: { type: string; value?: string }) => {
          if (el.type === 'temperature') temperature = parseFloat(el.value ?? '15');
          if (el.type === 'windSpeed') windSpeed = parseFloat(el.value ?? '10');
          if (el.type === 'precipitation') precipitation = parseFloat(el.value ?? '0');
        });
      }
    }
  } catch {
    isMock = true;
  }

  if (isMock) {
    const rand = Math.random();
    if (rand > 0.8) {
      temperature = 5 + Math.floor(Math.random() * 10);
      precipitation = Math.floor(Math.random() * 80);
      windSpeed = 15 + Math.floor(Math.random() * 30);
    } else if (rand > 0.5) {
      temperature = 10 + Math.floor(Math.random() * 10);
      precipitation = Math.floor(Math.random() * 30);
      windSpeed = 10 + Math.floor(Math.random() * 15);
    } else {
      temperature = 15 + Math.floor(Math.random() * 10);
      precipitation = Math.floor(Math.random() * 10);
      windSpeed = 5 + Math.floor(Math.random() * 10);
    }
  }

  if (precipitation > 50 || windSpeed > 40) {
    riskLevel = 'high';
    description = precipitation > 50 ? 'Heavy rain expected - consider postponing' : 'High winds expected - secure equipment';
  } else if (precipitation > 20 || windSpeed > 25) {
    riskLevel = 'medium';
    description = precipitation > 20 ? 'Rain expected - plan for wet conditions' : 'Moderate winds - monitor conditions';
  }

  return { date: input.date, temperature, wind_speed: windSpeed, precipitation, risk_level: riskLevel, description, is_mock: isMock };
}

export async function getScheduleOverview(
  input: GetScheduleOverviewInput,
  supabase: SupabaseClient,
  companyId: string | null
): Promise<Record<string, unknown>> {
  const now = new Date();
  const month = input.month ?? now.getMonth() + 1;
  const year = input.year ?? now.getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  let query = supabase
    .from('schedule_entries')
    .select('*, jobs:job_id (id, job_number, title, client_id, clients:client_id (id, company_name))')
    .gte('start_datetime', startDate.toISOString())
    .lte('start_datetime', endDate.toISOString())
    .order('start_datetime', { ascending: true });
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const byDate: Record<string, unknown[]> = {};
  (data ?? []).forEach((entry: Record<string, unknown>) => {
    const dateKey = (entry.start_datetime as string).split('T')[0];
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(entry);
  });

  return { month, year, entries_by_date: byDate, total_entries: (data ?? []).length };
}

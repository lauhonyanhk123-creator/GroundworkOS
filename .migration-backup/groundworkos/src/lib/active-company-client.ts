'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import { ACTIVE_COMPANY_COOKIE } from '@/lib/active-company-shared'

// Browser-side counterpart of resolveActiveCompany. Lists the user's
// memberships (RLS limits the query to their own rows) and honours the
// switcher cookie only when it matches one of them, so a tampered cookie can
// never select a company the user does not belong to. Returns null when the
// user has no company yet (the dashboard layout redirects to /onboarding).
export async function getActiveCompanyId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_companies')
    .select('company_id')
    .eq('user_id', userId)

  if (error) throw error

  const memberships = (data ?? []).map((row) => (row as { company_id: string }).company_id)
  if (memberships.length === 0) return null

  const match = document.cookie.match(
    new RegExp('(?:^|; )' + ACTIVE_COMPANY_COOKIE + '=([^;]*)')
  )
  const selected = match ? decodeURIComponent(match[1]) : null

  if (selected && memberships.includes(selected)) return selected
  return memberships[0]
}

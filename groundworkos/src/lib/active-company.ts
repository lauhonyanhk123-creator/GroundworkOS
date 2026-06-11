import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ACTIVE_COMPANY_COOKIE } from '@/lib/active-company-shared'

export { ACTIVE_COMPANY_COOKIE }

export interface CompanyMembership {
  company_id: string
  role: string
}

// Server-side resolution of the company a request acts on. The cookie set by
// the company switcher is treated as a preference, never as authority: it is
// only honoured when it matches one of the user's own memberships (which RLS
// already restricts to rows where user_id = auth.uid()).
export async function resolveActiveCompany(
  supabase: SupabaseClient,
  userId: string
): Promise<{ companyId: string | null; role: string | null }> {
  try {
    const { data, error } = await supabase
      .from('user_companies')
      .select('company_id, role')
      .eq('user_id', userId)

    if (error) throw error

    const memberships = (data ?? []) as CompanyMembership[]
    if (memberships.length === 0) {
      return { companyId: null, role: null }
    }

    // An unreadable cookie store must not discard valid memberships — fall
    // back to the first membership instead.
    let selected: string | undefined
    try {
      const cookieStore = await cookies()
      selected = cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value
    } catch {
      selected = undefined
    }

    const match = selected
      ? memberships.find((m) => m.company_id === selected)
      : undefined

    const active = match ?? memberships[0]
    return { companyId: active.company_id, role: active.role }
  } catch (error) {
    console.error('[active-company] Failed to resolve active company:', error)
    return { companyId: null, role: null }
  }
}

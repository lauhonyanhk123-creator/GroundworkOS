import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ACTIVE_COMPANY_COOKIE } from '@/lib/active-company-shared'

interface OnboardingBody {
  name?: string
  email?: string
  phone?: string
  address?: string
  vat_number?: string
}

// Creates a company and its founding admin membership for a user who has no
// company yet. user_companies has no client-side write policies (see
// database/schema.sql), so both inserts use the service-role client after the
// membership check.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 })
    }

    const body = (await request.json()) as OnboardingBody
    const name = body.name?.trim()
    if (!name) {
      return NextResponse.json({ data: null, error: 'Company name is required.' }, { status: 400 })
    }

    const { data: memberships, error: membershipError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .limit(1)

    if (membershipError) throw membershipError
    if (memberships && memberships.length > 0) {
      return NextResponse.json(
        { data: null, error: 'Your account already belongs to a company.' },
        { status: 409 }
      )
    }

    const admin = createAdminClient()

    const { data: company, error: companyError } = await admin
      .from('companies')
      .insert({
        name,
        email: body.email?.trim() || user.email || null,
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
        vat_number: body.vat_number?.trim() || null,
      })
      .select('id')
      .single()

    if (companyError || !company) throw companyError ?? new Error('Company insert returned no row')

    const { error: linkError } = await admin.from('user_companies').insert({
      user_id: user.id,
      company_id: company.id,
      role: 'admin',
    })

    if (linkError) {
      // No transactions over the REST API — compensate so a failed link does
      // not strand an ownerless company.
      await admin.from('companies').delete().eq('id', company.id)
      throw linkError
    }

    const response = NextResponse.json({ data: { companyId: company.id }, error: null })
    response.cookies.set(ACTIVE_COMPANY_COOKIE, company.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
    return response
  } catch (error) {
    console.error('[onboarding] Failed to create company:', error)
    return NextResponse.json(
      { data: null, error: 'Could not set up your company. Please try again.' },
      { status: 500 }
    )
  }
}

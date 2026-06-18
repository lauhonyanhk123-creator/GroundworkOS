import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { xeroClient } from '@/lib/xero';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('[Xero Callback] OAuth error:', error);
      return NextResponse.redirect(new URL('/settings?xero=error', siteUrl));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/settings?xero=error', siteUrl));
    }

    // Validate CSRF state
    const cookieState = request.cookies.get('xero_oauth_state')?.value;
    if (!cookieState || cookieState !== state) {
      console.error('[Xero Callback] State mismatch — possible CSRF attempt');
      return NextResponse.redirect(new URL('/settings?xero=error', siteUrl));
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', siteUrl));
    }

    // Get company_id for this user
    const { data: uc, error: ucError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (ucError || !uc?.company_id) {
      console.error('[Xero Callback] No company found for user:', ucError);
      return NextResponse.redirect(new URL('/settings?xero=error', siteUrl));
    }

    // Exchange code for tokens — pass the full callback URL as xero-node's apiCallback expects
    const callbackUrl = `${process.env.XERO_REDIRECT_URI ?? ''}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state ?? '')}`;
    const tokens = await xeroClient.exchangeCodeForTokens(callbackUrl);

    // Store tokens in xero_connections (upsert on company_id)
    const { error: upsertError } = await supabase
      .from('xero_connections')
      .upsert({
        company_id: uc.company_id,
        tenant_id: tokens.tenant_id,
        tenant_name: tokens.tenant_name,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at,
        connected_at: new Date().toISOString(),
      }, { onConflict: 'company_id' });

    if (upsertError) {
      console.error('[Xero Callback] Failed to store tokens:', upsertError);
      return NextResponse.redirect(new URL('/settings?xero=error', siteUrl));
    }

    // Clear CSRF cookie
    const response = NextResponse.redirect(new URL('/settings?xero=connected', siteUrl));
    response.cookies.delete('xero_oauth_state');

    return response;
  } catch (err) {
    console.error('[Xero Callback] Unexpected error:', err);
    return NextResponse.redirect(new URL('/settings?xero=error', siteUrl));
  }
}

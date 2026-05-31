import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { xeroClient } from '@/lib/xero';
import { randomBytes } from 'crypto';

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'));
    }

    const state = randomBytes(16).toString('hex');
    const authUrl = xeroClient.getAuthUrl(state);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set('xero_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[Xero Connect]', err);
    return NextResponse.redirect(
      new URL('/settings?xero=error', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')
    );
  }
}

import { type NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password');
  const isAuthCallback = pathname.startsWith('/auth/callback');
  const isPublicPath = pathname === '/' || pathname.startsWith('/api') || pathname.startsWith('/_next');

  if (isAuthCallback || isPublicPath) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  try {
    const cookieHeader = request.headers.get('cookie') || '';
    
    const sessionResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'cookie': cookieHeader,
      },
    });

    const isAuthenticated = sessionResponse.ok;

    if (!isAuthenticated && !isAuthPage) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (isAuthenticated && isAuthPage) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } catch {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

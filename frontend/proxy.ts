import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get('session_token');

  if (!sessionCookie) {
    return redirectToLogin(request);
  }

  try {
    const meResponse = await fetch(`${API_URL}/auth/me`, {
      headers: { cookie: `session_token=${sessionCookie.value}` },
    });

    if (!meResponse.ok) {
      return redirectToLogin(request);
    }
  } catch {
    // Backend unreachable — fail closed, not open. A broken backend
    // should not mean protected routes become unprotected.
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/dashboard/:path*', '/theses/new'],
};

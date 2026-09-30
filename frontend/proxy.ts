import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { BACKEND_URL } from './lib/backend-url';
import { safeNextPath } from './lib/safe-next-path';

// Next.js 16 renamed middleware.ts to proxy.ts to make the network-
// boundary role explicit — same behavior, new name and export.
//
// Asks the backend's own /auth/me - the same source of truth the rest
// of the app uses - rather than re-implementing JWT verification here.
// See docs/decisions/002-cookie-based-jwt-auth.md for why the session
// lives in a cookie the proxy can read.
//
// Two jobs:
// - protected pages: no valid session means a redirect to /login
// - /login and /signup: an already-valid session means there's nothing
//   to do there, so go where they were headed (?next=) or the dashboard
const AUTH_PAGES = ['/login', '/signup'];

export async function proxy(request: NextRequest) {
  const signedIn = await hasValidSession(request);

  if (AUTH_PAGES.includes(request.nextUrl.pathname)) {
    if (!signedIn) return NextResponse.next();
    const next = safeNextPath(request.nextUrl.searchParams.get('next')) ?? '/dashboard';
    return NextResponse.redirect(new URL(next, request.url));
  }

  if (!signedIn) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const sessionCookie = request.cookies.get('session_token');
  // No cookie means no network call at all - the common case on /login.
  if (!sessionCookie) return false;

  try {
    const meResponse = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: { cookie: `session_token=${sessionCookie.value}` },
    });
    return meResponse.ok;
  } catch {
    // Backend unreachable - fail closed, not open. Protected pages stay
    // protected, and /login and /signup simply show as normal.
    return false;
  }
}

export const config = {
  // /theses/:id deliberately stays outside this matcher - a published
  // thesis has to be viewable by anyone, gated per-request on the
  // backend instead (see OptionalJwtAuthGuard).
  matcher: ['/dashboard/:path*', '/theses/new', '/theses/mine', '/theses/:id/edit', '/login', '/signup'],
};

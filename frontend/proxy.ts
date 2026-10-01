import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { BACKEND_URL } from './lib/backend-url';
import { safeNextPath } from './lib/safe-next-path';

const AUTH_PAGES = ['/login', '/signup'];
const SESSION_COOKIE = 'session_token';

export async function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE);

  if (AUTH_PAGES.includes(request.nextUrl.pathname)) {
    if (!sessionCookie || !(await isValidSession(sessionCookie.value))) return NextResponse.next();
    const next = safeNextPath(request.nextUrl.searchParams.get('next')) ?? '/dashboard';
    return NextResponse.redirect(new URL(next, request.url));
  }

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

async function isValidSession(token: string): Promise<boolean> {
  try {
    const meResponse = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: { cookie: `${SESSION_COOKIE}=${token}` },
    });
    return meResponse.ok;
  } catch {
    return false;
  }
}

export const config = {
  // /theses/:id deliberately stays outside this matcher - a published
  // thesis has to be viewable by anyone, gated per-request on the
  // backend instead (see OptionalJwtAuthGuard).
  matcher: ['/dashboard/:path*', '/theses/new', '/theses/mine', '/theses/:id/edit', '/login', '/signup'],
};

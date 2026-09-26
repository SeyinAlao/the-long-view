import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Next.js 16 renamed middleware.ts to proxy.ts to make the network-
// boundary role explicit — same behavior, new name and export.
//
// Phase 1: this now does a real check. It asks the backend's own
// /auth/me — the same source of truth the rest of the app uses — rather
// than re-implementing JWT verification here. That costs one extra
// network round trip per protected navigation, in exchange for never
// having two different places that can disagree about what a valid
// session is. See docs/decisions/002-cookie-based-jwt-auth.md for why
// the session lives in a cookie the proxy can actually read.
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
  // Only /theses/new is gated here, not /theses/:path* broadly — a
  // future thesis detail page has to stay publicly viewable for
  // published theses (see OptionalJwtAuthGuard on the backend), so this
  // matcher must not accidentally cover it.
  matcher: ['/dashboard/:path*', '/theses/new'],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Next.js 16 renamed middleware.ts to proxy.ts to make the network-boundary
// role explicit — same behavior, new name and export.
// Phase 0: wired but not yet enforcing anything — there is no auth system
// to check against yet. Phase 1 replaces the TODO below with a real
// session check and a redirect to /login for anything under (protected).
export function proxy(_request: NextRequest) {
  // TODO (Phase 1): read the session cookie, verify it, redirect if missing/invalid.
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};

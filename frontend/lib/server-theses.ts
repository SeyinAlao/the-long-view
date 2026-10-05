import { cookies } from 'next/headers';
import type { Thesis } from './theses';
import { BACKEND_URL, backendTimeoutSignal } from './backend-url';
import { serverEdgeHeaders } from './edge-headers';

// Server Component-only, same pattern as getCurrentUserServer in
// lib/server-auth.ts — reads the incoming request's session cookie
// directly and asks the backend for one specific thesis. The backend's
// own OptionalJwtAuthGuard already enforces draft privacy; this just
// forwards whatever session exists so that enforcement actually runs.
//
// null means the backend said 404 (no such thesis, or someone else's
// draft). Anything else that goes wrong - the API down, a 500, the
// timeout - throws, so the page shows the error page and its "Try
// again", never "this page isn't on the record" for a thesis that exists.
export async function getThesisServer(id: string): Promise<Thesis | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session_token');

  const res = await fetch(`${BACKEND_URL}/theses/${encodeURIComponent(id)}`, {
    headers: {
      ...(sessionCookie ? { cookie: `session_token=${sessionCookie.value}` } : {}),
      ...serverEdgeHeaders(),
    },
    cache: 'no-store',
    signal: backendTimeoutSignal(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Loading thesis ${id} failed with ${res.status}`);
  return (await res.json()) as Thesis;
}

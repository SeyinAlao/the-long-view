import { cookies } from 'next/headers';
import type { SafeUser } from './auth';
import { BACKEND_URL, backendTimeoutSignal } from './backend-url';
import { serverEdgeHeaders } from './edge-headers';

// null means signed out: no cookie, or the backend rejected it (401).
// Anything else - the API down, a 500, the timeout - throws, so a
// signed-in person sees the error page and "Try again" rather than
// being treated as signed out and sent to /login during an outage.
export async function getCurrentUserServer(): Promise<SafeUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session_token');

  if (!sessionCookie) {
    return null;
  }

  const res = await fetch(`${BACKEND_URL}/auth/me`, {
    headers: { cookie: `session_token=${sessionCookie.value}`, ...serverEdgeHeaders() },
    cache: 'no-store',
    signal: backendTimeoutSignal(),
  });

  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Checking the session failed with ${res.status}`);

  const data = (await res.json()) as { user: SafeUser };
  return data.user;
}

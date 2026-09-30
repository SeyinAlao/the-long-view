import { cookies } from 'next/headers';
import type { Thesis } from './theses';
import { BACKEND_URL } from './backend-url';

// Server Component-only, same pattern as getCurrentUserServer in
// lib/server-auth.ts — reads the incoming request's session cookie
// directly and asks the backend for one specific thesis. The backend's
// own OptionalJwtAuthGuard already enforces draft privacy; this just
// forwards whatever session exists so that enforcement actually runs.
export async function getThesisServer(id: string): Promise<Thesis | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session_token');

  try {
    const res = await fetch(`${BACKEND_URL}/theses/${id}`, {
      headers: sessionCookie ? { cookie: `session_token=${sessionCookie.value}` } : {},
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as Thesis;
  } catch {
    return null;
  }
}

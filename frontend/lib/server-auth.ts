import { cookies } from 'next/headers';
import type { SafeUser } from './auth';
import { BACKEND_URL } from './backend-url';

export async function getCurrentUserServer(): Promise<SafeUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session_token');

  if (!sessionCookie) {
    return null;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: { cookie: `session_token=${sessionCookie.value}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as { user: SafeUser };
    return data.user;
  } catch {
    return null;
  }
}

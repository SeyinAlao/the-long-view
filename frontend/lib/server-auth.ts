import { cookies } from 'next/headers';
import type { SafeUser } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function getCurrentUserServer(): Promise<SafeUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session_token');

  if (!sessionCookie) {
    return null;
  }

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
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

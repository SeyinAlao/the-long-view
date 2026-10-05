import { BACKEND_URL, backendTimeoutSignal } from './backend-url';
import { serverEdgeHeaders } from './edge-headers';

// In the browser, always this app's own /api path (forwarded to the
// backend by next.config's rewrites), so the session cookie stays
// first-party. On the server - Server Components like the feed - there
// is no browser origin to be relative to, so it calls the backend
// directly. Decided per call, not once at import, since this module is
// shared by both.
const onServer = () => typeof window === 'undefined';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${onServer() ? BACKEND_URL : '/api'}${path}`, {
    ...init,
    // Server-side only: a page render must end in the page or the error
    // page. In the browser, TanStack Query owns retries and waiting.
    signal: init?.signal ?? (onServer() ? backendTimeoutSignal() : undefined),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      // On the server only: the browser's calls get these in proxy.ts.
      ...(onServer() ? serverEdgeHeaders() : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message)
      ? body.message.join(' ')
      : (body?.message ?? `Request to ${path} failed with ${res.status}`);
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Every form's error display needs the same thing: show the backend's
// real message when there is one, a plain fallback when there isn't.
// One helper, reused everywhere, so "wrong password" always says wrong
// password instead of a generic error.
export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return 'Something went wrong. Try again.';
}

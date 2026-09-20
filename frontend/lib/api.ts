// Single place the frontend knows the backend's base URL. Every TanStack
// Query hook should import from here rather than reading
// process.env.NEXT_PUBLIC_API_URL directly, so there is exactly one thing
// to change if the API's shape or location changes later.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    // Required for the session cookie to actually be sent/received —
    // frontend (3000) and backend (4000) are different origins as far
    // as the browser's cookie jar is concerned, even on localhost.
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    // NestJS's ValidationPipe returns `message` as an array of strings
    // when several fields fail at once (e.g. bad email AND short
    // password); a single business-rule error (wrong password, taken
    // email) comes back as one string. Handle both.
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

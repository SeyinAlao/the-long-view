// Single place the frontend knows the backend's base URL. Every TanStack
// Query hook should import from here rather than reading
// process.env.NEXT_PUBLIC_API_URL directly, so there is exactly one thing
// to change if the API's shape or location changes later.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
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

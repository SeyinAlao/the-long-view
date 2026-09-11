// Single place the frontend knows the backend's base URL. Every TanStack
// Query hook should import from here rather than reading
// process.env.NEXT_PUBLIC_API_URL directly, so there is exactly one thing
// to change if the API's shape or location changes later.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`Request to ${path} failed with ${res.status}`);
  }

  return res.json() as Promise<T>;
}

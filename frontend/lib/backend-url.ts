// Where server-side code (proxy.ts, Server Components, next.config's
// rewrites) reaches the backend directly. Deliberately NOT a
// NEXT_PUBLIC_ variable: the browser must never call the backend
// directly - it always goes through this app's own /api path instead.
// See docs/decisions/007-same-origin-api-proxy.md for why.
export const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4000';

// How long a server-side call waits for the backend before giving up
// and showing the error page. Deliberately long: Render's free API takes
// about 46s to wake, and a waking API must keep showing the skeleton,
// not an error. 90s clears that with room to spare and stays well under
// Vercel Hobby's 300s function limit, so the visitor sees this app's own
// error page rather than a platform timeout. API_TIMEOUT_MS exists so the
// browser tests can prove the timeout without waiting 90s.
const DEFAULT_TIMEOUT_MS = 90_000;

export function backendTimeoutSignal(): AbortSignal {
  const configured = Number(process.env.API_TIMEOUT_MS);
  return AbortSignal.timeout(configured > 0 ? configured : DEFAULT_TIMEOUT_MS);
}

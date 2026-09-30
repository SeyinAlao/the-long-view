// Where server-side code (proxy.ts, Server Components, next.config's
// rewrites) reaches the backend directly. Deliberately NOT a
// NEXT_PUBLIC_ variable: the browser must never call the backend
// directly - it always goes through this app's own /api path instead.
// See docs/decisions/007-same-origin-api-proxy.md for why.
export const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4000';

// Every rate-limit number in the API, in one place (ADR 010).
//
// Per-IP limits count only requests whose client IP the frontend vouched
// for (edge-client.middleware.ts). Nigerian mobile networks put many
// people behind one address, so the per-IP numbers are generous; the
// strict ones are login (per IP and per account) and writes.
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const RATE_LIMITS = {
  // Any route without its own policy: reading the Ledger, the
  // leaderboard, a thesis, /auth/me.
  read: { limit: 1_000, windowMs: MINUTE },
  login: { limit: 30, windowMs: 15 * MINUTE },
  register: { limit: 30, windowMs: HOUR },
  // Starting Google sign-in and Google's redirect back.
  google: { limit: 30, windowMs: 15 * MINUTE },
  // Creating, saving, publishing and discarding theses; counter-theses.
  write: { limit: 60, windowMs: 15 * MINUTE },
} as const;

export type RateLimitPolicy = keyof typeof RATE_LIMITS;

// Failed password sign-ins for one email, from any IP. Unknown emails
// count the same way, so a 429 never says whether an account exists.
export const ACCOUNT_FAILURES = { limit: 10, windowMs: 15 * MINUTE } as const;

// The most clients (or accounts) each limiter remembers. Past this, the
// entry closest to expiring is dropped first, so a flood of made-up IPs
// or emails costs a bounded amount of memory (about 100 bytes an entry).
export const MAX_TRACKED_KEYS = 20_000;

// How often "the store is full" may be logged, per limiter.
export const STORE_FULL_LOG_INTERVAL_MS = MINUTE;

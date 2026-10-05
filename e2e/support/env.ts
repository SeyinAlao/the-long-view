import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Where the browser tests get their database, and the one place that
// refuses anything but a test database. Loaded by playwright.config.ts,
// so it runs before any server starts or any table is touched.
//
// Order: DATABASE_URL already in the environment wins (CI sets it),
// then backend/.env.test.local (the local Postgres, gitignored).
// backend/.env is deliberately never read here: it points at a real
// database.
function fromLocalFile(): string | undefined {
  const file = join(__dirname, '..', '..', 'backend', '.env.test.local');
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('DATABASE_URL='));
  return line?.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
}

export const DATABASE_URL = process.env.DATABASE_URL ?? fromLocalFile() ?? '';

const databaseName = (() => {
  try {
    return new URL(DATABASE_URL).pathname.replace(/^\//, '');
  } catch {
    return '';
  }
})();

if (!/test/i.test(databaseName)) {
  throw new Error(
    `Refusing to run browser tests: the database name is "${databaseName || '(unset)'}", which does not ` +
      'contain "test". Every test wipes its tables. Set DATABASE_URL, or put the local test database ' +
      'in backend/.env.test.local (see docs/deployment.md).',
  );
}

export const FRONTEND_PORT = 3000;
export const BACKEND_PORT = 4000;
export const RELAY_PORT = 4100;
// 127.0.0.1, not localhost: the relay listens on IPv4 only, and "localhost"
// can resolve to ::1 first.
export const RELAY_URL = `http://127.0.0.1:${RELAY_PORT}`;

// The frontend's server-side wait for the API (lib/backend-url.ts),
// shortened from production's 90s so the timeout can be tested. Still
// well above the cold-start test's 12s delay, which must not time out.
export const API_TIMEOUT_MS = 20_000;

// The fake Google (support/fake-google.mjs). IPv4 literal: the API only
// accepts Google endpoint overrides on 127.0.0.1.
export const FAKE_GOOGLE_PORT = 4200;
export const FAKE_GOOGLE_URL = `http://127.0.0.1:${FAKE_GOOGLE_PORT}`;

// The edge key (ADR 010), the same on both servers, with the API
// enforcing it as production will: every browser call goes through the
// frontend's proxy.ts, which adds it. A fixed test value, not a secret.
export const EDGE_PROXY_KEY = 'e2e-edge-key-not-a-secret-0123456789abcdef';

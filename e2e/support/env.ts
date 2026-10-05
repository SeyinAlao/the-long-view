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
export const RELAY_URL = `http://localhost:${RELAY_PORT}`;

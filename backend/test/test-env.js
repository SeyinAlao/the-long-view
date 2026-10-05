// Loads the e2e environment and refuses anything but a test database.
// Required twice on purpose: by Jest's globalSetup (once, before any
// spec) and by setupFiles (inside every test worker). A worker has its
// own environment, and NestJS's ConfigModule fills any gap from
// backend/.env - which points at a real database - so the worker must
// load the same settings the guard approved, and check them itself.
//
// Order: a DATABASE_URL already set in the shell wins (e.g. the Neon
// test branch as a fallback), then backend/.env.test.local (the local
// Postgres, gitignored), then backend/.env, exactly as the app would
// see it. dotenv never overwrites a value that is already set.
//
// Plain JS, not TypeScript: Jest loads globalSetup outside the ts-jest
// transform, so a .ts file here risks not being transpiled.
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env.test.local'), quiet: true });
dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

// The in-process 5:30pm / 6:00pm jobs must never fire mid-run: a real
// NGX fetch would write prices into the test database under a test.
process.env.DISABLE_SCHEDULED_JOBS = 'true';

// An allowlist, not a blocklist: the database must be deliberately
// named as a test database. A blocklist against "prod" would miss a
// database named the default "neondb".
let databaseName = null;
try {
  databaseName = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '') : null;
} catch {
  databaseName = null; // an unparseable URL is treated as unsafe, not skipped
}

if (!databaseName || !/test/i.test(databaseName)) {
  console.error(
    '\n' +
      '✕ Refusing to run e2e tests.\n' +
      `  DATABASE_URL's database name is "${databaseName ?? '(unset or unparseable)'}", ` +
      'which does not contain "test".\n' +
      '  Every e2e spec wipes its database between tests - this check exists so that\n' +
      '  can never happen to a real database by accident.\n' +
      '  Put the local test database in backend/.env.test.local (see docs/deployment.md).\n',
  );
  throw new Error('DATABASE_URL does not point at a test database - refusing to run e2e tests.');
}

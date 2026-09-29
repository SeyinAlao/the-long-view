// Jest globalSetup — runs once, before any e2e spec file starts, in
// every environment these tests ever run in (a developer's machine,
// CI, a future deploy pipeline). Every e2e spec's afterEach/beforeEach
// calls deleteMany() with no filter, on whatever database DATABASE_URL
// points at. There has never been anything stopping that from being
// pointed at a real, production database - this is that stop.
//
// Plain JS, not TypeScript: Jest loads globalSetup directly, outside
// the ts-jest transform pipeline used for test files, so a .ts file
// here risks not being transpiled consistently across Jest versions.
//
// The check is deliberately an allowlist, not a blocklist: it demands
// the database's own name contain "test", rather than trying to guess
// every way a production URL might look different. A blocklist against
// "prod" would miss a database named the default "neondb", or anything
// else that doesn't happen to say "prod" - a database has to be
// deliberately, visibly named as a test database to pass.
//
// dotenv, loaded here explicitly: NestJS's own ConfigModule normally
// loads backend/.env automatically, but only once AppModule actually
// starts up - inside each spec file's beforeAll, which runs AFTER this
// globalSetup. Without this line, DATABASE_URL looks unset here even
// when a real, correct one is sitting in .env, because nothing has
// loaded it yet at the point this file runs. dotenv never overwrites a
// value already set in the environment, so an inline DATABASE_URL=...
// still takes priority over .env exactly as it always has.
require('dotenv').config();

module.exports = async function globalSetup() {
  const rawUrl = process.env.DATABASE_URL;

  let databaseName = null;
  try {
    if (rawUrl) {
      databaseName = new URL(rawUrl).pathname.replace(/^\//, '');
    }
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
        '  Point DATABASE_URL at a database whose name actually contains "test", e.g.\n' +
        '  the_long_view_test.\n',
    );
    throw new Error('DATABASE_URL does not point at a test database - refusing to run e2e tests.');
  }
};

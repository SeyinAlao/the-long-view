import { Pool } from 'pg';
import { DATABASE_URL } from './env';

// Direct database access for setup only: clearing tables and creating
// price rows, which no user action can do. env.ts has already refused
// anything that isn't a test database before this module loads.
const pool = new Pool({ connectionString: DATABASE_URL, max: 2 });

// Children before parents, so no foreign key is ever violated. The
// seeded companies (Security) stay: every test needs them.
const TABLES_IN_FK_ORDER = [
  'ThesisMetric',
  'CounterThesis',
  'ThesisOutcome',
  'Comment',
  'Reaction',
  'Watchlist',
  'Follow',
  'Thesis',
  'Price',
  'User',
];

export async function resetDatabase(): Promise<void> {
  for (const table of TABLES_IN_FK_ORDER) {
    await pool.query(`DELETE FROM "${table}"`);
  }
}

// A real-looking price row, `ageDays` old. Publishing reads the newest
// row and refuses one older than 7 days (ADR 004).
export async function addPrice(ticker: string, price: number, ageDays = 0): Promise<void> {
  const { rowCount } = await pool.query(
    `INSERT INTO "Price" (id, "securityId", price, "recordedAt")
     SELECT gen_random_uuid()::text, id, $2, now() - make_interval(days => $3)
     FROM "Security" WHERE ticker = $1`,
    [ticker, price, ageDays],
  );
  if (rowCount !== 1) throw new Error(`No seeded security with ticker ${ticker}`);
}

// As if the account predates the Terms checkpoint, or the Terms have
// changed since it accepted (ADR 014).
export async function withdrawTermsAcceptance(username: string): Promise<void> {
  const { rowCount } = await pool.query('UPDATE "User" SET "termsVersion" = NULL, "termsAcceptedAt" = NULL WHERE username = $1', [
    username,
  ]);
  if (rowCount !== 1) throw new Error(`No user ${username}`);
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}

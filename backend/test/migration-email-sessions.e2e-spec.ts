import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

// Runs the real migration file against a throwaway copy of the "User"
// table in its own schema, so both outcomes can be checked without
// touching the migrated test database itself.
const MIGRATION = readFileSync(
  join(__dirname, '..', 'prisma', 'migrations', '20261005120000_case_insensitive_email_session_version', 'migration.sql'),
  'utf8',
);
const SCHEMA = 'migration_check';

describe('Migration: case-insensitive email and session version', () => {
  let client: Client;

  const column = async (name: string) =>
    (
      await client.query(
        'SELECT udt_name, column_default FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND column_name = $3',
        [SCHEMA, 'User', name],
      )
    ).rows[0] as { udt_name: string; column_default: string | null } | undefined;
  const emails = async () =>
    (await client.query('SELECT email::text FROM "User" ORDER BY id')).rows.map((r: { email: string }) => r.email);

  beforeEach(async () => {
    client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE; CREATE SCHEMA ${SCHEMA}`);
    // public stays on the path for the citext type the migration uses.
    await client.query(`SET search_path = ${SCHEMA}, public`);
    await client.query('CREATE TABLE "User" (id text PRIMARY KEY, email text NOT NULL UNIQUE)');
  });

  afterEach(async () => {
    await client.query('ROLLBACK').catch(() => undefined);
    await client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await client.end();
  });

  it('lowercases emails, makes the column citext and adds sessionVersion', async () => {
    await client.query(`INSERT INTO "User" VALUES ('1', 'Ana@Example.COM'), ('2', 'bo@example.com')`);

    await client.query(MIGRATION);

    expect(await emails()).toEqual(['ana@example.com', 'bo@example.com']);
    expect((await column('email'))?.udt_name).toBe('citext');
    expect(await column('sessionVersion')).toEqual({ udt_name: 'int4', column_default: '0' });
  });

  it('refuses, changing nothing, when two emails differ only by letter case', async () => {
    await client.query(`INSERT INTO "User" VALUES ('1', 'Bo@Example.com'), ('2', 'bo@example.com')`);

    await expect(client.query(MIGRATION)).rejects.toThrow(/differing only by letter case/);
    await client.query('ROLLBACK');

    expect(await emails()).toEqual(['Bo@Example.com', 'bo@example.com']);
    expect((await column('email'))?.udt_name).toBe('text');
    expect(await column('sessionVersion')).toBeUndefined();
  });
});

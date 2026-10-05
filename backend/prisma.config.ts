// New in Prisma 7: connection config lives here, not in schema.prisma.
// schema.prisma now describes pure data structure only.
//
// DIRECT_URL, not DATABASE_URL: on Neon (and any pooled Postgres),
// migrations and other CLI commands need the direct, non-pooled
// connection - running them through a pooler (PgBouncer) is Neon's own
// documented cause of migration failures and timeouts. The running
// app's own queries still go through DATABASE_URL (the pooled
// connection), set separately in PrismaService.
//
// Falls back to DATABASE_URL when DIRECT_URL isn't set, so a local
// Postgres with no pooler - the common case in development - still
// works with just the one variable.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Only for `prisma migrate diff --to-migrations` (checking a database
// against the migration history, docs/deployment.md). Prisma drops and
// recreates everything in a shadow database, so this refuses any whose
// name doesn't say "shadow" - a slip can never point it at a real one.
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;
if (shadowDatabaseUrl && !/shadow/i.test(new URL(shadowDatabaseUrl).pathname)) {
  throw new Error('SHADOW_DATABASE_URL must name a throwaway database with "shadow" in its name.');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    shadowDatabaseUrl,
  },
});

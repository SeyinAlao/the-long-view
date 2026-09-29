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

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});

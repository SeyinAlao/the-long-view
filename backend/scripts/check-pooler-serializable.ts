// Read-only check that a Serializable transaction works through Neon's
// pooled connection, the way the API runs Google account linking (ADR
// 003): Prisma's pg adapter sends BEGIN, then SET TRANSACTION ISOLATION
// LEVEL SERIALIZABLE. This opens one such transaction, makes it read-only
// too, reads one row and ends it. It writes nothing.
//
// Run from backend/ (docs/deployment.md):
//   $env:POOLED_URL = "<pooled connection string>"; npm run db:check-pooler
//
// Deliberately no dotenv: backend/.env points at production, and this
// must only ever use the URL given for this run.
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function pooledUrl(): URL {
  const raw = process.env.POOLED_URL;
  if (!raw) throw new Error('Set POOLED_URL to the pooled connection string first.');
  const url = new URL(raw);
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (!url.hostname.includes('-pooler') && !local) {
    throw new Error(`${url.hostname} is not a pooled host (no "-pooler"); this check is for the pooled URL.`);
  }
  return url;
}

async function main() {
  const url = pooledUrl();
  console.log(`Host: ${url.hostname}  Database: ${url.pathname}`);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Allowed here: nothing has been read yet in this transaction.
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const [isolation] = await tx.$queryRaw<{ transaction_isolation: string }[]>`SHOW transaction_isolation`;
        const [readOnly] = await tx.$queryRaw<{ transaction_read_only: string }[]>`SHOW transaction_read_only`;
        const row = await tx.user.findFirst({ select: { id: true } });
        return { isolation: isolation.transaction_isolation, readOnly: readOnly.transaction_read_only, row: !!row };
      },
      { isolationLevel: 'Serializable' },
    );

    console.log(`Isolation: ${result.isolation}  Read-only: ${result.readOnly}`);
    console.log(result.row ? 'Read one row: yes' : 'Read one row: no rows (the table is empty)');
    if (result.isolation !== 'serializable' || result.readOnly !== 'on') {
      throw new Error('The transaction did not run as Serializable and read-only.');
    }
    console.log('OK: a Serializable transaction works through this connection.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: { name?: string; code?: string; message?: string }) => {
  // Name, code and message only: never the connection string.
  console.error(`FAILED: ${error.name ?? 'Error'}${error.code ? ` ${error.code}` : ''}: ${error.message ?? ''}`);
  process.exit(1);
});

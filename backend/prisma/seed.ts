// Loads the real NGX-listed company roster into the Security table.
// Run with: npm run db:seed (from backend/).
//
// currentPrice/previousPrice are placeholders (100.00, 0% change) — real
// NGX price data is Phase 5 (Market data), not this phase. Every security
// is upserted by ticker, so re-running this is always safe.
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const PLACEHOLDER_PRICE = '100.00';

async function main() {
  // Prisma 7's generated client requires an explicit driver adapter —
  // there's no more "just pass a url" constructor. Same adapter setup as
  // PrismaService; this script just isn't running inside Nest's DI, so it
  // has to build its own client instance directly.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const csvPath = join(__dirname, 'seed-data', 'ngx-listed-companies.csv');
  const lines = readFileSync(csvPath, 'utf-8').trim().split('\n');
  const [, ...rows] = lines;

  let count = 0;
  for (const row of rows) {
    const [ticker, name, sector] = row.split(',');
    await prisma.security.upsert({
      where: { ticker },
      update: { companyName: name, sector },
      create: {
        ticker,
        companyName: name,
        sector,
        currentPrice: PLACEHOLDER_PRICE,
        previousPrice: PLACEHOLDER_PRICE,
      },
    });
    count += 1;
  }

  console.log(`Seeded ${count} securities.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

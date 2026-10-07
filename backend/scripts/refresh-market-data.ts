// Manual, on-demand trigger for the same refresh the scheduler runs
// automatically once a day — for testing, or for catching up after
// downtime, without waiting for the next scheduled run.
// Run with: npm run market-data:refresh (from backend/).
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { MarketDataService } from '../src/market-data/market-data.service';
import type { PrismaService } from '../src/prisma/prisma.service';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const service = new MarketDataService(prisma as unknown as PrismaService);

  const result = await service.refreshPrices();
  console.log(
    `Updated ${result.updated} securities. ${result.alreadyStored} already stored for their trade date. Ignored ${result.skippedUnrecognized} unrecognized tickers. NGX trade date ${result.tradeDate}.`,
  );

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Market data refresh failed:', error);
  process.exit(1);
});

// The stale-price alert, run each weekday morning by its own workflow in
// the private jobs repo ("Stale price alert"). Read-only: one query for
// the newest price row. Exits 1, so the run fails and emails, once two
// weekday refreshes in a row are missing (src/market-data/price-freshness.ts).
// Run with: npm run market-data:freshness (from backend/).
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ALERT_AT_MISSED_WEEKDAYS, missedWeekdays } from '../src/market-data/price-freshness';

const lagosTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' });

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const newest = await prisma.price.findFirst({ orderBy: { recordedAt: 'desc' }, select: { recordedAt: true } });
    if (!newest) throw new Error('STALE PRICES: there are no price rows at all.');
    const missed = missedWeekdays(newest.recordedAt, new Date());
    const summary = `Newest price saved ${lagosTime.format(newest.recordedAt)} (Lagos); ${missed} weekday refresh(es) missed since.`;
    if (missed >= ALERT_AT_MISSED_WEEKDAYS) {
      throw new Error(`STALE PRICES: ${summary} Publishing stops 7 days after the last refresh (ADR 009).`);
    }
    console.log(`OK. ${summary}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});

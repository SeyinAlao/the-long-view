import type { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { calendarDaysBetween, lagosDate } from './feed-checks';

// Which price row stands for which trading day, for publishing (the
// reference price, ADR 004) and grading (the price at the horizon), so
// the two always agree.
//
// Rows saved since migration 20261007120000 carry NGX's own trading day
// (tradeDate). Older rows have none: for those, the day is the Lagos date
// the row was saved, as before. Runs start hours late, so the saved time
// can fall on the next Lagos day; tradeDate never does.

// ADR 004: a thesis is graded against its reference price forever, so
// that price must be a real market price, and a recent one. Seven days
// covers weekends and NGX's longest public-holiday closures, while still
// noticing within a week if the daily price job has stopped working.
// Measured on the trading day, so a frozen feed can't make an old close
// look fresh.
export const MAX_REFERENCE_PRICE_AGE_DAYS = 7;

const COLUMNS = { price: true, tradeDate: true, recordedAt: true } as const;

export type PriceRow = { price: Prisma.Decimal; tradeDate: Date | null; recordedAt: Date };

// The trading day a row stands for, as YYYY-MM-DD.
export function priceDay(row: PriceRow): string {
  return row.tradeDate ? row.tradeDate.toISOString().slice(0, 10) : lagosDate(row.recordedAt);
}

export function isRecentEnough(row: PriceRow, now: Date): boolean {
  return calendarDaysBetween(priceDay(row), lagosDate(now)) <= MAX_REFERENCE_PRICE_AGE_DAYS;
}

// The newest close for a company: its latest trading day.
export async function latestPrice(
  prisma: PrismaService,
  securityId: string,
): Promise<PriceRow | null> {
  const [dated, undated] = await Promise.all([
    prisma.price.findFirst({
      where: { securityId, tradeDate: { not: null } },
      orderBy: { tradeDate: 'desc' },
      select: COLUMNS,
    }),
    prisma.price.findFirst({
      where: { securityId, tradeDate: null },
      orderBy: { recordedAt: 'desc' },
      select: COLUMNS,
    }),
  ]);
  return pick(dated, undated, (a, b) => a > b);
}

// The close a thesis is graded on: the first trading day on or after the
// Lagos date its horizon ends.
export async function firstPriceOnOrAfter(
  prisma: PrismaService,
  securityId: string,
  resolveAt: Date,
): Promise<PriceRow | null> {
  const resolveDay = new Date(`${lagosDate(resolveAt)}T00:00:00Z`);
  const [dated, undated] = await Promise.all([
    prisma.price.findFirst({
      where: { securityId, tradeDate: { gte: resolveDay } },
      orderBy: { tradeDate: 'asc' },
      select: COLUMNS,
    }),
    prisma.price.findFirst({
      where: { securityId, tradeDate: null, recordedAt: { gte: resolveAt } },
      orderBy: { recordedAt: 'asc' },
      select: COLUMNS,
    }),
  ]);
  return pick(dated, undated, (a, b) => a < b);
}

// Of a dated and an undated candidate, the one whose day wins; on the
// same day, the dated one (NGX's own date is the more exact).
function pick(
  dated: PriceRow | null,
  undated: PriceRow | null,
  wins: (a: string, b: string) => boolean,
) {
  if (!dated || !undated) return dated ?? undated;
  return wins(priceDay(undated), priceDay(dated)) ? undated : dated;
}

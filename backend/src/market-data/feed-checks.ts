import type { MarketPrice } from './market-price';
import { parseNgxEquities, type FeedResponse } from './ngx-equities-source';

// The checks a day's prices must pass before anything is written. Pure,
// so the read-only check script (market-data:check) and the real refresh
// share them. A refusal writes nothing and leaves the last real prices
// in place.
const MIN_EXPECTED = 100; // we track 147 equities; NGX lists about 146
// A feed whose newest trading day is older than this is frozen, not just
// a weekend or holiday behind. Storing it would stamp old prices as
// fresh, and publishing trusts the newest price row (ADR 004).
const MAX_TRADE_DATE_AGE_DAYS = 5;

export class FeedRefusedError extends Error {}

export type AssessedFeed = { prices: MarketPrice[]; tradeDate: string; diagnostics: string };

export function assessFeed(response: FeedResponse, now: Date): AssessedFeed {
  const parsed = parseNgxEquities(response.body);
  const tradeDates = [...new Set(parsed.prices.map((p) => p.tradeDate))].sort().reverse();
  const today = lagosDate(now);
  // Numbers and short labels only: never any of the response's content.
  const diagnostics = [
    `status=${response.status}`,
    `type=${plain(response.contentType)}`,
    `length=${response.bodyLength}`,
    `rows=${parsed.rows}`,
    `valid=${parsed.prices.length}`,
    `invalid=${parsed.invalid}`,
    `tradeDates=${tradeDates.slice(0, 3).join(',') || '-'}`,
    `lagos=${today} ${lagosTime(now)}`,
  ].join(' ');
  const refuse = (why: string) => new FeedRefusedError(`NGX prices refused - writing nothing: ${why}. ${diagnostics}`);

  if (response.status !== 200) throw refuse(`HTTP ${response.status}`);
  if (parsed.prices.length < MIN_EXPECTED) {
    throw refuse(`only ${parsed.prices.length} usable entries (expected ${MIN_EXPECTED}+)`);
  }
  const newest = tradeDates[0];
  if (daysBetween(newest, today) > MAX_TRADE_DATE_AGE_DAYS) {
    throw refuse(`newest trade date ${newest} is more than ${MAX_TRADE_DATE_AGE_DAYS} days before ${today} (Lagos)`);
  }
  return { prices: parsed.prices, tradeDate: newest, diagnostics };
}

// Calendar dates in Lagos time, never the machine's own zone.
const lagosDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' });
const lagosClock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export function lagosDate(now: Date): string {
  return lagosDay.format(now);
}

function lagosTime(now: Date): string {
  return lagosClock.format(now);
}

function daysBetween(earlier: string, later: string): number {
  return (Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / 86_400_000;
}

function plain(value: string): string {
  return value.replace(/[^\w/;=.-]/g, '').slice(0, 60) || '-';
}

import type { MarketPrice } from './market-price';
import { lagosDate } from './feed-checks';
import { lagosMinutesOfDay, SAFE_AFTER_MINUTES } from './trading-hours';

// Since a stored close is never overwritten (one row per company per
// trading day), a wrong trade date would stick. Before anything is
// written, every row's date must be one a closing price can have:
// - not today in Lagos before 4:30pm (the day's close isn't final yet;
//   a run before 9:00am could see today's date on yesterday's prices);
// - not in the future (a bad feed or a wrong clock);
// - not a Saturday or Sunday (NGX doesn't trade then).
// Any such row refuses the whole run: nothing is written, the script
// exits 1 and the workflow run fails and emails. There is deliberately
// no override. Dates are Lagos dates, never the machine's zone.
export class TradeDateRefusedError extends Error {}

export function assertTradeDatesStorable(prices: MarketPrice[], now: Date): void {
  const today = lagosDate(now);
  const beforeSafeHour = lagosMinutesOfDay(now) < SAFE_AFTER_MINUTES;
  const problems = [
    describe(
      prices.filter((p) => p.tradeDate > today),
      `dated after today (${today} in Lagos)`,
    ),
    describe(
      prices.filter((p) => isWeekend(p.tradeDate)),
      'dated on a Saturday or Sunday, when NGX does not trade',
    ),
    describe(
      beforeSafeHour ? prices.filter((p) => p.tradeDate === today) : [],
      `dated today (${today}) before 4:30pm Lagos, when the day's closing prices may not be final`,
    ),
  ].filter((problem): problem is string => problem !== null);
  if (problems.length > 0) {
    throw new TradeDateRefusedError(
      `NGX prices refused - writing nothing: ${problems.join('; ')}. Run it again after 4:30pm Lagos on a weekday.`,
    );
  }
}

function describe(rows: MarketPrice[], why: string): string | null {
  if (rows.length === 0) return null;
  const dates = [...new Set(rows.map((r) => r.tradeDate))].sort().join(', ');
  const examples = rows
    .slice(0, 3)
    .map((r) => r.ticker)
    .join(', ');
  return `${rows.length} row(s) ${why} [trade date ${dates}; e.g. ${examples}]`;
}

function isWeekend(date: string): boolean {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return weekday === 0 || weekday === 6;
}

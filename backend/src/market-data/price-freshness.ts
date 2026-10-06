import { lagosDate } from './feed-checks';

// The stale-price alert (run by its own workflow in the private jobs
// repo): it fails, and so emails, once two weekday refreshes in a row
// are missing - days before publishing stops at 7 days (ADR 009). It
// catches what a failed run can't report: a schedule that never fires.
export const ALERT_AT_MISSED_WEEKDAYS = 2;

// Weekdays after the newest price's Lagos date and before today's, so a
// morning check doesn't count today's refresh, which hasn't run yet.
// Public holidays count as weekdays: a refresh still runs and saves rows.
export function missedWeekdays(newestSavedAt: Date, now: Date): number {
  const DAY_MS = 86_400_000;
  const from = Date.parse(`${lagosDate(newestSavedAt)}T00:00:00Z`);
  const to = Date.parse(`${lagosDate(now)}T00:00:00Z`);
  let missed = 0;
  for (let day = from + DAY_MS; day < to; day += DAY_MS) {
    const weekday = new Date(day).getUTCDay();
    if (weekday !== 0 && weekday !== 6) missed += 1;
  }
  return missed;
}

// NGX trades 9:00am-4:00pm Lagos time on weekdays (since 27 April
// 2026), and its public price list runs about 30 minutes behind. A
// refresh in between would store mid-day prices as if they were the
// day's close - and every refresh adds a price row, so they would stick.
// Times are always read in Lagos time, never the machine's own zone.
const LAGOS = 'Africa/Lagos';
const OPEN_MINUTES = 9 * 60; // 9:00am
const SAFE_AFTER_MINUTES = 16 * 60 + 30; // 4:30pm: 4:00pm close + page lag
const WEEKEND = new Set(['Sat', 'Sun']);

const lagosParts = new Intl.DateTimeFormat('en-US', {
  timeZone: LAGOS,
  weekday: 'short',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
});

const lagosClock = new Intl.DateTimeFormat('en-US', {
  timeZone: LAGOS,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

export function isInsideTradingWindow(now: Date): boolean {
  const parts = Object.fromEntries(lagosParts.formatToParts(now).map((p) => [p.type, p.value]));
  if (WEEKEND.has(parts.weekday)) return false;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return minutes >= OPEN_MINUTES && minutes < SAFE_AFTER_MINUTES;
}

export function assertOutsideTradingWindow(now: Date): void {
  if (!isInsideTradingWindow(now)) return;
  const time = lagosClock.format(now).replace(' ', '').toLowerCase();
  throw new Error(
    `Refusing to refresh prices at ${time} Lagos time on a weekday. NGX trades 9:00am-4:00pm ` +
      'and its price list runs about 30 minutes behind, so prices fetched now would be mid-day ' +
      'prices, not closing prices. Run it after 4:30pm Lagos time.',
  );
}

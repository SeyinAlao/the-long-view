import { assertTradeDatesStorable, TradeDateRefusedError } from './trade-date-guard';
import type { MarketPrice } from './market-price';

// Wednesday 7 October 2026 is a weekday; Saturday 10 October is not.
const lagos = (dateTime: string) => new Date(`${dateTime}+01:00`);
const rows = (tradeDate: string, count = 3): MarketPrice[] =>
  Array.from({ length: count }, (_, i) => ({ ticker: `T${i}`, closePrice: 10, changePercent: 0, tradeDate }));
const check = (prices: MarketPrice[], now: Date) => () => assertTradeDatesStorable(prices, now);

describe('assertTradeDatesStorable', () => {
  it("allows the scheduled 5:30pm run storing today's closes", () => {
    expect(check(rows('2026-10-07'), lagos('2026-10-07T17:30:00'))).not.toThrow();
  });

  describe("today's date before 4:30pm Lagos", () => {
    it('refuses at 4:29pm', () => {
      expect(check(rows('2026-10-07'), lagos('2026-10-07T16:29:00'))).toThrow(
        /dated today \(2026-10-07\) before 4:30pm Lagos/,
      );
    });

    it('allows from 4:30pm exactly', () => {
      expect(check(rows('2026-10-07'), lagos('2026-10-07T16:30:00'))).not.toThrow();
    });

    it("refuses before 9am, when the feed might show today's date on yesterday's prices", () => {
      expect(check(rows('2026-10-07'), lagos('2026-10-07T07:00:00'))).toThrow(TradeDateRefusedError);
    });

    it("allows yesterday's closes before 9am", () => {
      expect(check(rows('2026-10-06'), lagos('2026-10-07T07:00:00'))).not.toThrow();
    });
  });

  describe('past midnight, when the UTC date and the Lagos date differ', () => {
    // 23:30 UTC on Wednesday 7 October is 00:30 Thursday 8 October in Lagos.
    const justAfterMidnight = new Date('2026-10-07T23:30:00Z');

    it("allows Wednesday's closes: yesterday in Lagos, though still the 7th in UTC", () => {
      expect(check(rows('2026-10-07'), justAfterMidnight)).not.toThrow();
    });

    it('refuses a row dated Thursday: today in Lagos and before 4:30pm (not future, though UTC is still the 7th)', () => {
      expect(check(rows('2026-10-08'), justAfterMidnight)).toThrow(/dated today \(2026-10-08\) before 4:30pm Lagos/);
    });
  });

  it('refuses a date in the future', () => {
    expect(check(rows('2026-10-08'), lagos('2026-10-07T18:00:00'))).toThrow(/dated after today \(2026-10-07 in Lagos\)/);
  });

  it('refuses a weekend date, even after the close', () => {
    expect(check(rows('2026-10-10'), lagos('2026-10-12T18:00:00'))).toThrow(/dated on a Saturday or Sunday/);
  });

  it('refuses the whole run for a single bad row, naming the date and an example', () => {
    const prices = [...rows('2026-10-07', 140), { ticker: 'MTNN', closePrice: 847, changePercent: 0, tradeDate: '2026-10-11' }];
    expect(check(prices, lagos('2026-10-07T18:00:00'))).toThrow(
      /^NGX prices refused - writing nothing: 1 row\(s\) dated after today .*\[trade date 2026-10-11; e\.g\. MTNN\].*Saturday or Sunday.*Run it again after 4:30pm Lagos on a weekday\.$/,
    );
  });
});

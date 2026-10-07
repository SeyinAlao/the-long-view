import { ALERT_AT_MISSED_WEEKDAYS, missedWeekdays } from './price-freshness';

const lagos = (dateTime: string) => new Date(`${dateTime}+01:00`);

describe('missedWeekdays', () => {
  it("counts nothing the morning after a weekday's refresh", () => {
    expect(missedWeekdays(lagos('2026-10-06T22:07:00'), lagos('2026-10-07T08:47:00'))).toBe(0);
  });

  it("doesn't count the weekend: Friday's prices are current on Monday morning", () => {
    expect(missedWeekdays(lagos('2026-10-09T22:00:00'), lagos('2026-10-12T08:47:00'))).toBe(0);
  });

  it('counts one missed refresh, which is below the alert', () => {
    const missed = missedWeekdays(lagos('2026-10-06T22:07:00'), lagos('2026-10-08T08:47:00'));
    expect(missed).toBe(1);
    expect(missed).toBeLessThan(ALERT_AT_MISSED_WEEKDAYS);
  });

  it('alerts at two missed weekday refreshes in a row, across a weekend', () => {
    // Thursday's prices; Friday and Monday missed; checked Tuesday morning.
    expect(missedWeekdays(lagos('2026-10-08T22:00:00'), lagos('2026-10-13T08:47:00'))).toBe(ALERT_AT_MISSED_WEEKDAYS);
  });

  it('reads dates in Lagos: a run saved at 23:30 UTC belongs to the next Lagos day', () => {
    // 23:30 UTC on Tuesday is 00:30 Wednesday in Lagos.
    expect(missedWeekdays(new Date('2026-10-06T23:30:00Z'), lagos('2026-10-08T08:47:00'))).toBe(0);
  });
});

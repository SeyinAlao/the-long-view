import { assessFeed, FeedRefusedError, lagosDate } from './feed-checks';
import type { FeedResponse } from './ngx-equities-source';

const rows = (count: number, tradeDate = '2026-10-07') =>
  Array.from({ length: count }, (_, i) => ({ Symbol: `T${i}`, ClosePrice: 10, PercChange: 0, TradeDate: `${tradeDate}T00:00:00` }));
const response = (body: unknown, status = 200): FeedResponse => ({
  status,
  contentType: 'application/json; charset=utf-8',
  bodyLength: 56_076,
  body,
});
const lagos = (dateTime: string) => new Date(`${dateTime}+01:00`);

describe('assessFeed', () => {
  it('passes a full, current feed, naming its trade date', () => {
    const result = assessFeed(response(rows(146)), lagos('2026-10-07T18:00:00'));
    expect(result.prices).toHaveLength(146);
    expect(result.tradeDate).toBe('2026-10-07');
    expect(result.diagnostics).toBe(
      'status=200 type=application/json;charset=utf-8 length=56076 rows=146 valid=146 invalid=0 tradeDates=2026-10-07 lagos=2026-10-07 18:00',
    );
  });

  it('refuses an error status', () => {
    expect(() => assessFeed(response(rows(146), 403), lagos('2026-10-07T18:00:00'))).toThrow(/HTTP 403/);
  });

  it('refuses fewer than 100 usable prices, counting what it saw', () => {
    expect(() => assessFeed(response(rows(99)), lagos('2026-10-07T18:00:00'))).toThrow(
      /only 99 usable entries \(expected 100\+\)\. status=200 .* rows=99 valid=99/,
    );
  });

  it('allows a feed up to 5 days behind (a long weekend), and refuses one older', () => {
    const tuesdayEvening = lagos('2026-10-13T18:00:00');
    expect(assessFeed(response(rows(146, '2026-10-08')), tuesdayEvening).tradeDate).toBe('2026-10-08');
    expect(() => assessFeed(response(rows(146, '2026-10-07')), tuesdayEvening)).toThrow(
      /newest trade date 2026-10-07 is more than 5 days before 2026-10-13 \(Lagos\)/,
    );
  });

  it('dates "today" in Lagos, not the machine zone: 23:30 UTC is already tomorrow in Lagos', () => {
    expect(lagosDate(new Date('2026-10-07T23:30:00Z'))).toBe('2026-10-08');
  });

  it('never puts any of the response body in a refusal', () => {
    const body = [{ Symbol: 'SECRETISH', ClosePrice: 'leaked text', TradeDate: 'leaked date' }];
    try {
      assessFeed({ ...response(body), contentType: 'text/html\n<script>' }, lagos('2026-10-07T18:00:00'));
      throw new Error('expected a refusal');
    } catch (error) {
      expect(error).toBeInstanceOf(FeedRefusedError);
      const message = (error as Error).message;
      expect(message).not.toMatch(/SECRETISH|leaked|<script>|\n/);
      expect(message).toContain('type=text/htmlscript');
    }
  });
});

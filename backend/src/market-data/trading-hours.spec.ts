import { MarketDataService } from './market-data.service';
import type { PrismaService } from '../prisma/prisma.service';

// Every time is written with Lagos's +01:00 offset, so the clock is
// fixed whatever zone the machine running the tests is in.
// 7 October 2026 is a Wednesday; 10 October a Saturday.
const lagos = (dateTime: string) => new Date(`${dateTime}+01:00`);

function setUp() {
  const prisma = {
    security: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
    price: { create: jest.fn() },
  };
  const service = new MarketDataService(prisma as unknown as PrismaService);
  // Enough usable prices, recent enough, to pass the feed's own checks.
  const rows = Array.from({ length: 120 }, (_, i) => ({ Symbol: `T${i}`, ClosePrice: 1, PercChange: 0, TradeDate: '2026-10-07T00:00:00' }));
  const fetchPage = jest
    .spyOn(service, 'fetchFeed')
    .mockResolvedValue({ status: 200, contentType: 'application/json', bodyLength: 1, body: rows });
  return { service, prisma, fetchPage };
}

describe('MarketDataService.refreshPrices during NGX trading hours', () => {
  it.each([
    ['mid-session', '2026-10-07T11:15:00', '11:15am'],
    ['at the opening bell', '2026-10-07T09:00:00', '9:00am'],
    ['one minute before prices are safe', '2026-10-07T16:29:00', '4:29pm'],
  ])('refuses %s, before fetching or writing anything', async (_, time, shown) => {
    const { service, prisma, fetchPage } = setUp();

    await expect(service.refreshPrices(lagos(time))).rejects.toThrow(
      `Refusing to refresh prices at ${shown} Lagos time on a weekday. NGX trades 9:00am-4:00pm ` +
        'and its price list runs about 30 minutes behind, so prices fetched now would be mid-day ' +
        'prices, not closing prices. Run it after 4:30pm Lagos time.',
    );
    expect(fetchPage).not.toHaveBeenCalled();
    expect(prisma.security.findMany).not.toHaveBeenCalled();
  });

  it.each([
    // The next morning, so the feed's 7 October closes are yesterday's: a
    // row dated today before 4:30pm is refused by trade-date-guard.ts.
    ['one minute before the open', '2026-10-08T08:59:00'],
    ['exactly 4:30pm', '2026-10-07T16:30:00'],
    ['just after 4:30pm', '2026-10-07T16:31:00'],
    ['on a Saturday during weekday trading hours', '2026-10-10T11:15:00'],
  ])('allows a refresh %s', async (_, time) => {
    const { service, fetchPage } = setUp();

    await expect(service.refreshPrices(lagos(time))).resolves.toEqual({
      updated: 0,
      alreadyStored: 0,
      skippedUnrecognized: 120,
      tradeDate: '2026-10-07',
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});

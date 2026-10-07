import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { MarketDataService } from '../src/market-data/market-data.service';
import { firstPriceOnOrAfter, latestPrice, priceDay } from '../src/market-data/price-history';
import type { FeedResponse } from '../src/market-data/ngx-equities-source';
import { createTestApp } from './create-test-app';

// Prices carry NGX's trading day (migration 20261007120000): one row per
// company per trading day, and publishing and grading read the day from
// it rather than from when a late run happened to save the row.
describe('Prices by trading day (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let securityId: string;
  const lagos = (dateTime: string) => new Date(`${dateTime}+01:00`);
  const day = (date: string) => new Date(`${date}T00:00:00Z`);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    securityId = (await prisma.security.findUniqueOrThrow({ where: { ticker: 'OKOMUOIL' } })).id;
  });

  afterEach(() => prisma.price.deleteMany({ where: { securityId } }));
  afterAll(() => app.close());

  it('grades on the first trading day on or after the resolve date, not on when a late run saved the row', async () => {
    // The 6 October close, saved by a late run at 00:30 Lagos on 7 October.
    await prisma.price.create({
      data: { securityId, price: 400, tradeDate: day('2026-10-06'), recordedAt: new Date('2026-10-06T23:30:00Z') },
    });
    await prisma.price.create({
      data: { securityId, price: 410, tradeDate: day('2026-10-07'), recordedAt: new Date('2026-10-07T21:00:00Z') },
    });

    // The horizon ends at 00:15 on 7 October: the 6 October close is too early.
    const graded = await firstPriceOnOrAfter(prisma, securityId, lagos('2026-10-07T00:15:00'));
    expect(Number(graded?.price)).toBe(410);
    expect(priceDay(graded!)).toBe('2026-10-07');
  });

  it('still grades on an older row without a trade date, by when it was saved', async () => {
    await prisma.price.create({ data: { securityId, price: 390, recordedAt: lagos('2026-10-02T21:00:00') } });
    const graded = await firstPriceOnOrAfter(prisma, securityId, lagos('2026-10-02T10:00:00'));
    expect(Number(graded?.price)).toBe(390);
  });

  it('takes the newest trading day as the latest price, over an older undated row', async () => {
    await prisma.price.create({ data: { securityId, price: 380, recordedAt: lagos('2026-10-05T21:00:00') } });
    await prisma.price.create({
      data: { securityId, price: 405, tradeDate: day('2026-10-06'), recordedAt: lagos('2026-10-06T22:00:00') },
    });
    expect(Number((await latestPrice(prisma, securityId))?.price)).toBe(405);
  });

  it("a second refresh for the same trading day writes nothing and leaves each company's price alone", async () => {
    const tickers = (await prisma.security.findMany({ select: { ticker: true }, orderBy: { ticker: 'asc' }, take: 110 })).map(
      (s) => s.ticker,
    );
    const feed = (close: number): FeedResponse => ({
      status: 200,
      contentType: 'application/json',
      bodyLength: 1,
      body: tickers.map((t) => ({ Symbol: t, ClosePrice: close, PercChange: 0, TradeDate: '2026-10-07T00:00:00' })),
    });
    const service = app.get(MarketDataService);
    const afterClose = lagos('2026-10-07T18:00:00');
    const started = new Date();
    try {
      jest.spyOn(service, 'fetchFeed').mockResolvedValueOnce(feed(11)).mockResolvedValueOnce(feed(99));
      expect(await service.refreshPrices(afterClose)).toMatchObject({ updated: 110, alreadyStored: 0 });
      expect(await service.refreshPrices(afterClose)).toMatchObject({ updated: 0, alreadyStored: 110 });

      const rows = await prisma.price.findMany({ where: { tradeDate: day('2026-10-07') }, select: { price: true } });
      expect(rows).toHaveLength(110);
      expect(rows.every((r) => Number(r.price) === 11)).toBe(true);
    } finally {
      jest.restoreAllMocks();
      // Everything this test saved, dated or not, so nothing leaks into
      // other specs (theses.e2e expects NESTLE to have no price).
      await prisma.price.deleteMany({ where: { recordedAt: { gte: started }, security: { ticker: { in: tickers } } } });
    }
  });
});

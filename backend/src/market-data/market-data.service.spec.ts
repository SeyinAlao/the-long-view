import { Prisma } from '../../generated/prisma/client';
import { MarketDataService } from './market-data.service';
import type { FeedResponse } from './ngx-equities-source';
import type { PrismaService } from '../prisma/prisma.service';

// A weekday evening in Lagos, after the close, so the trading-hours
// guard never decides these tests (see trading-hours.spec.ts).
const AFTER_CLOSE = new Date('2026-10-07T18:00:00+01:00');

const feed = (rows: object[], status = 200): FeedResponse => ({
  status,
  contentType: 'application/json; charset=utf-8',
  bodyLength: 56_076,
  body: rows,
});
const row = (Symbol: string, ClosePrice: number) => ({ Symbol, ClosePrice, PercChange: 0.5, TradeDate: '2026-10-07T00:00:00' });
const manyRows = (extra: object[] = []) => [...extra, ...Array.from({ length: 120 }, (_, i) => row(`OTHER${i}`, 10))];

function setUp() {
  const prisma = {
    security: {
      findMany: jest.fn().mockResolvedValue([{ id: 'sec_1', ticker: 'MTNN', currentPrice: '842.00' }]),
      update: jest.fn().mockResolvedValue({}),
    },
    price: { create: jest.fn().mockResolvedValue({}) },
    // An array transaction: every write in it succeeds or none does.
    $transaction: jest.fn((writes: Promise<unknown>[]) => Promise.all(writes)),
  };
  return { prisma, service: new MarketDataService(prisma as unknown as PrismaService) };
}

describe('MarketDataService.refreshPrices', () => {
  it.each([
    ['too few usable prices', feed([row('MTNN', 847)])],
    ['an error status', feed(manyRows(), 403)],
    ['a body that is not a list of prices', { ...feed([]), body: undefined }],
    ['a frozen feed (newest trade date 6+ days old)', feed(manyRows().map((r) => ({ ...r, TradeDate: '2026-10-01T00:00:00' })))],
  ])('refuses %s without touching the database', async (_, response) => {
    const { prisma, service } = setUp();
    jest.spyOn(service, 'fetchFeed').mockResolvedValue(response);

    await expect(service.refreshPrices(AFTER_CLOSE)).rejects.toThrow(/NGX prices refused - writing nothing/);
    expect(prisma.security.findMany).not.toHaveBeenCalled();
    expect(prisma.security.update).not.toHaveBeenCalled();
    expect(prisma.price.create).not.toHaveBeenCalled();
  });

  it('writes only securities it already knows, at their close price, and reports the trade date', async () => {
    const { prisma, service } = setUp();
    const fetchFeed = jest.spyOn(service, 'fetchFeed').mockResolvedValue(feed(manyRows([row('MTNN', 847)])));

    const result = await service.refreshPrices(AFTER_CLOSE);

    expect(fetchFeed).toHaveBeenCalledTimes(1);
    expect(prisma.security.update).toHaveBeenCalledTimes(1);
    expect(prisma.security.update).toHaveBeenCalledWith({
      where: { ticker: 'MTNN' },
      data: { previousPrice: '842.00', currentPrice: 847 },
    });
    expect(prisma.price.create).toHaveBeenCalledWith({
      data: { securityId: 'sec_1', price: 847, tradeDate: new Date('2026-10-07T00:00:00Z') },
    });
    expect(result).toEqual({ updated: 1, alreadyStored: 0, skippedUnrecognized: 120, tradeDate: '2026-10-07' });
  });

  it('leaves a company alone when its close for that trading day is already stored', async () => {
    const { prisma, service } = setUp();
    jest.spyOn(service, 'fetchFeed').mockResolvedValue(feed(manyRows([row('MTNN', 847)])));
    // The unique index on (securityId, tradeDate) refuses the second row.
    prisma.price.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' }),
    );

    const result = await service.refreshPrices(AFTER_CLOSE);

    expect(result).toEqual({ updated: 0, alreadyStored: 1, skippedUnrecognized: 120, tradeDate: '2026-10-07' });
  });

  it('stops the run on any other database error', async () => {
    const { prisma, service } = setUp();
    jest.spyOn(service, 'fetchFeed').mockResolvedValue(feed(manyRows([row('MTNN', 847)])));
    prisma.price.create.mockRejectedValue(new Error('connection lost'));

    await expect(service.refreshPrices(AFTER_CLOSE)).rejects.toThrow('connection lost');
  });
});

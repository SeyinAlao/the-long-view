import { readFileSync } from 'fs';
import { join } from 'path';
import { MarketDataService } from './market-data.service';
import type { PrismaService } from '../prisma/prisma.service';

// Real content captured from the live NGX page, not fabricated — this
// is a genuine sample including the exact messiness the real page has:
// bracket-suffixed tickers (AFRINSURE [MRF]), bond and fund tickers
// mixed in among equities, real current prices.
const realSample = readFileSync(join(__dirname, '__fixtures__/ngx-sample.txt'), 'utf-8');

describe('MarketDataService.parsePriceList', () => {
  const service = new MarketDataService({} as PrismaService);

  it('extracts a plain ticker with a positive and a negative price correctly', () => {
    const results = service.parsePriceList(realSample);
    const mtnn = results.find((r) => r.ticker === 'MTNN');
    const dangsugar = results.find((r) => r.ticker === 'DANGSUGAR');

    expect(mtnn).toEqual({ ticker: 'MTNN', price: 863.0, changePercent: 8.0 });
    expect(dangsugar).toEqual({ ticker: 'DANGSUGAR', price: 71.0, changePercent: 0.0 });
  });

  it('handles a ticker with a bracket suffix like [MRF] without corrupting the ticker or the price', () => {
    const results = service.parsePriceList(realSample);
    const afrinsure = results.find((r) => r.ticker === 'AFRINSURE');

    expect(afrinsure).toEqual({ ticker: 'AFRINSURE', price: 0.2, changePercent: 0.0 });
  });

  it('handles a negative change percentage correctly', () => {
    const results = service.parsePriceList(realSample);
    const total = results.find((r) => r.ticker === 'TOTAL');

    expect(total).toEqual({ ticker: 'TOTAL', price: 518.4, changePercent: -57.6 });
  });

  it('parses bond and fund tickers too — filtering to known equities is refreshPrices\' job, not the parser\'s', () => {
    const results = service.parsePriceList(realSample);
    expect(results.some((r) => r.ticker === 'FGS202789')).toBe(true);
    expect(results.some((r) => r.ticker === 'FFFBNBALF')).toBe(true);
  });

  it('never returns the same ticker twice even if the page lists it more than once', () => {
    const results = service.parsePriceList(realSample);
    const tickers = results.map((r) => r.ticker);
    expect(new Set(tickers).size).toBe(tickers.length);
  });

  it('parses a meaningful number of entries from a real sample, not just one or two', () => {
    const results = service.parsePriceList(realSample);
    expect(results.length).toBeGreaterThan(30);
  });
});

// A weekday evening in Lagos, after the close, so the trading-hours
// guard never decides these tests (see trading-hours.spec.ts).
const AFTER_CLOSE = new Date('2026-10-07T18:00:00+01:00');

describe('MarketDataService.refreshPrices', () => {
  it('refuses to touch the database at all if the parsed result looks suspiciously small', async () => {
    const prisma = { security: { findMany: jest.fn(), update: jest.fn() }, price: { create: jest.fn() } };
    const service = new MarketDataService(prisma as unknown as PrismaService);
    jest.spyOn(service, 'fetchNgxPriceListPage').mockResolvedValue('MTNN N863.00 8.00 %'); // just one entry

    await expect(service.refreshPrices(AFTER_CLOSE)).rejects.toThrow(/refusing to update/);
    expect(prisma.security.findMany).not.toHaveBeenCalled();
    expect(prisma.security.update).not.toHaveBeenCalled();
  });

  it('only ever updates securities it already recognizes, and silently counts the rest', async () => {
    const prisma = {
      security: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'sec_1', ticker: 'MTNN', currentPrice: '850.00' },
        ]),
        update: jest.fn().mockResolvedValue({}),
      },
      price: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new MarketDataService(prisma as unknown as PrismaService);
    const manyRealTickers = readFileSync(join(__dirname, '__fixtures__/ngx-sample.txt'), 'utf-8');
    jest.spyOn(service, 'fetchNgxPriceListPage').mockResolvedValue(manyRealTickers);

    const result = await service.refreshPrices(AFTER_CLOSE);

    expect(prisma.security.update).toHaveBeenCalledTimes(1);
    expect(prisma.security.update).toHaveBeenCalledWith({
      where: { ticker: 'MTNN' },
      data: { previousPrice: '850.00', currentPrice: 863.0 },
    });
    expect(result.updated).toBe(1);
    expect(result.skippedUnrecognized).toBeGreaterThan(10);
  });
});

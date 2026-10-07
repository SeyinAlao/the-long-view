import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertOutsideTradingWindow } from './trading-hours';
import { fetchNgxEquities, type FeedResponse } from './ngx-equities-source';
import { assessFeed } from './feed-checks';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  constructor(private readonly prisma: PrismaService) {}

  // One request to NGX's equities JSON (ADR 012). A method, so tests can
  // replace it without the network.
  fetchFeed(): Promise<FeedResponse> {
    return fetchNgxEquities();
  }

  // Refuses during NGX trading hours, before fetching anything. Then
  // fails safe: a failed fetch, an error status, too few usable prices
  // or a frozen feed (feed-checks.ts) refuses before the database is
  // touched, leaving the last real prices in place. Only securities we
  // already know are ever written. Each row stores NGX's trading day; a
  // company that already has a close for that day is left alone (one row
  // per company per trading day), so a second run never overwrites a
  // stored close. `now` is a parameter so tests can fix the clock.
  async refreshPrices(
    now: Date = new Date(),
  ): Promise<{
    updated: number;
    alreadyStored: number;
    skippedUnrecognized: number;
    tradeDate: string;
  }> {
    assertOutsideTradingWindow(now);
    const { prices, tradeDate } = assessFeed(await this.fetchFeed(), now);

    const knownSecurities = await this.prisma.security.findMany({ take: 1000 });
    const known = new Map(knownSecurities.map((s) => [s.ticker, s]));

    let updated = 0;
    let alreadyStored = 0;
    let skippedUnrecognized = 0;
    for (const entry of prices) {
      const security = known.get(entry.ticker);
      if (!security) {
        skippedUnrecognized += 1;
        continue;
      }
      try {
        // Together or not at all: the row first, so a day already stored
        // (the unique index on securityId + tradeDate) stops both.
        await this.prisma.$transaction([
          this.prisma.price.create({
            data: {
              securityId: security.id,
              price: entry.closePrice,
              tradeDate: new Date(`${entry.tradeDate}T00:00:00Z`),
            },
          }),
          this.prisma.security.update({
            where: { ticker: entry.ticker },
            data: { previousPrice: security.currentPrice, currentPrice: entry.closePrice },
          }),
        ]);
        updated += 1;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'))
          throw error;
        alreadyStored += 1;
      }
    }

    this.logger.log(
      `Refreshed ${updated} securities from NGX, trade date ${tradeDate} (${alreadyStored} already stored for their trade date, ${skippedUnrecognized} unrecognized tickers ignored).`,
    );
    return { updated, alreadyStored, skippedUnrecognized, tradeDate };
  }
}

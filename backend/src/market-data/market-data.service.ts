import { Injectable, Logger } from '@nestjs/common';
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
  // already know are ever written. `now` is a parameter so tests can fix
  // the clock.
  async refreshPrices(
    now: Date = new Date(),
  ): Promise<{ updated: number; skippedUnrecognized: number; tradeDate: string }> {
    assertOutsideTradingWindow(now);
    const { prices, tradeDate } = assessFeed(await this.fetchFeed(), now);

    const knownSecurities = await this.prisma.security.findMany({ take: 1000 });
    const known = new Map(knownSecurities.map((s) => [s.ticker, s]));

    let updated = 0;
    let skippedUnrecognized = 0;
    for (const entry of prices) {
      const security = known.get(entry.ticker);
      if (!security) {
        skippedUnrecognized += 1;
        continue;
      }
      await this.prisma.security.update({
        where: { ticker: entry.ticker },
        data: { previousPrice: security.currentPrice, currentPrice: entry.closePrice },
      });
      await this.prisma.price.create({ data: { securityId: security.id, price: entry.closePrice } });
      updated += 1;
    }

    this.logger.log(
      `Refreshed ${updated} securities from NGX, trade date ${tradeDate} (${skippedUnrecognized} unrecognized tickers ignored).`,
    );
    return { updated, skippedUnrecognized, tradeDate };
  }
}

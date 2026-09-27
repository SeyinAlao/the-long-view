import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MarketDataService } from './market-data.service';

@Injectable()
export class MarketDataScheduler {
  private readonly logger = new Logger(MarketDataScheduler.name);

  constructor(private readonly marketDataService: MarketDataService) {}

  @Cron('0 16 * * 1-5', { timeZone: 'Africa/Lagos' })
  async handleDailyRefresh() {
    try {
      const result = await this.marketDataService.refreshPrices();
      this.logger.log(`Scheduled refresh complete: ${result.updated} updated.`);
    } catch (error) {
      // Never let a bad fetch or a malformed page crash the scheduler
      // itself — log it loudly and wait for tomorrow's run. Yesterday's
      // real prices stay in place either way, which is the whole point
      // of refreshPrices() failing safe in the first place.
      this.logger.error('Scheduled market data refresh failed', error);
    }
  }
}

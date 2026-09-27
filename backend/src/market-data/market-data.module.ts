import { Module } from '@nestjs/common';
import { MarketDataService } from './market-data.service';
import { MarketDataScheduler } from './market-data.scheduler';

@Module({
  providers: [MarketDataService, MarketDataScheduler],
  exports: [MarketDataService],
})
export class MarketDataModule {}

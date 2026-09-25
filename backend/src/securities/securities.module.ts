import { Module } from '@nestjs/common';
import { SecuritiesController } from './securities.controller';
import { SecuritiesService } from './securities.service';

@Module({
  controllers: [SecuritiesController],
  providers: [SecuritiesService],
  exports: [SecuritiesService],
})
export class SecuritiesModule {}

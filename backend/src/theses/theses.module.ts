import { Module } from '@nestjs/common';
import { ThesesController } from './theses.controller';
import { ThesesService } from './theses.service';
import { SecuritiesModule } from '../securities/securities.module';

@Module({
  imports: [SecuritiesModule],
  controllers: [ThesesController],
  providers: [ThesesService],
})
export class ThesesModule {}

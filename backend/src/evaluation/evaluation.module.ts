import { Module } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { EvaluationScheduler } from './evaluation.scheduler';

@Module({
  providers: [EvaluationService, EvaluationScheduler],
  exports: [EvaluationService],
})
export class EvaluationModule {}

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EvaluationService } from './evaluation.service';

// Runs half an hour after the market-data refresh (5:30pm Lagos time)
// each weekday, so freshly-updated closing prices are actually available
// for any thesis resolving today, rather than evaluating against
// yesterday's numbers.
@Injectable()
export class EvaluationScheduler {
  private readonly logger = new Logger(EvaluationScheduler.name);

  constructor(private readonly evaluationService: EvaluationService) {}

  @Cron('0 18 * * 1-5', { name: 'evaluate-pending-theses', timeZone: 'Africa/Lagos' })
  async handleDailyEvaluation() {
    try {
      const result = await this.evaluationService.evaluatePendingTheses();
      this.logger.log(`Scheduled evaluation complete: ${result.evaluated} evaluated.`);
    } catch (error) {
      this.logger.error('Scheduled evaluation failed', error);
    }
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { MarketDataScheduler } from './market-data/market-data.scheduler';
import { MarketDataService } from './market-data/market-data.service';
import { EvaluationScheduler } from './evaluation/evaluation.scheduler';
import { EvaluationService } from './evaluation/evaluation.service';

// Boots the real ScheduleModule so these check the times the jobs are
// actually registered with, not just the strings in the decorators.
// The services are never called - no job fires during a test run.
describe('scheduled jobs', () => {
  let moduleRef: TestingModule;
  let registry: SchedulerRegistry;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        MarketDataScheduler,
        EvaluationScheduler,
        { provide: MarketDataService, useValue: {} },
        { provide: EvaluationService, useValue: {} },
      ],
    }).compile();
    await moduleRef.init();
    registry = moduleRef.get(SchedulerRegistry);
  });

  afterAll(() => moduleRef.close());

  // Next run after `from`, as a weekday and time in Lagos.
  function nextLagosRun(jobName: string, from: string): string {
    return registry
      .getCronJob(jobName)
      .cronTime.getNextDateFrom(new Date(from))
      .setZone('Africa/Lagos')
      .toFormat('ccc HH:mm');
  }

  // NGX closes at 4:00pm and its price list lags about 30 minutes, so
  // a refresh before 4:30pm would store intraday prices as the close.
  it('refreshes prices at 5:30pm Lagos time, after the close has been published', () => {
    expect(nextLagosRun('market-data-refresh', '2026-10-05T08:00:00+01:00')).toBe('Mon 17:30');
  });

  it('evaluates theses at 6:00pm Lagos time, after the refresh', () => {
    expect(nextLagosRun('evaluate-pending-theses', '2026-10-05T08:00:00+01:00')).toBe('Mon 18:00');
  });

  it('skips weekends, when NGX does not trade', () => {
    expect(nextLagosRun('market-data-refresh', '2026-10-09T19:00:00+01:00')).toBe('Mon 17:30');
    expect(nextLagosRun('evaluate-pending-theses', '2026-10-09T19:00:00+01:00')).toBe('Mon 18:00');
  });
});

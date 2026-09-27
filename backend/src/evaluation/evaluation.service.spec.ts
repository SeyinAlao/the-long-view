import { EvaluationService } from './evaluation.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('EvaluationService.computeOutcome', () => {
  const service = new EvaluationService({} as PrismaService);

  it('scores a perfect bullish call - direction right, magnitude exactly matched', () => {
    const result = service.computeOutcome(
      { id: 't1', referencePrice: 100, targetPrice: 120, conviction: 8, horizonDays: 180 },
      120,
    );
    expect(result.targetReturn).toBeCloseTo(0.2, 5);
    expect(result.actualReturn).toBeCloseTo(0.2, 5);
    // accuracy 1.0 * conviction 8 * sqrt(180/30) ≈ 19.596
    expect(result.outcomeScore).toBeCloseTo(19.5959, 3);
  });

  it('penalizes a call that went the wrong direction with a negative score', () => {
    const result = service.computeOutcome(
      { id: 't2', referencePrice: 100, targetPrice: 120, conviction: 8, horizonDays: 180 },
      90, // predicted up, actually went down
    );
    expect(result.actualReturn).toBeCloseTo(-0.1, 5);
    // accuracy -0.5 * conviction 8 * sqrt(6) ≈ -9.798
    expect(result.outcomeScore).toBeCloseTo(-9.798, 3);
    expect(result.outcomeScore).toBeLessThan(0);
  });

  it('clamps an overshot call at 2x rather than rewarding it unboundedly', () => {
    const result = service.computeOutcome(
      { id: 't3', referencePrice: 100, targetPrice: 120, conviction: 5, horizonDays: 30 },
      150, // predicted +20%, actually +50% - way past the target
    );
    // accuracy ratio is really 2.5, but clamped to 2 before scoring
    expect(result.outcomeScore).toBeCloseTo(10, 3); // 2 * 5 * sqrt(30/30)=1
  });

  it('clamps a catastrophically wrong call at -1 rather than an unbounded penalty', () => {
    const result = service.computeOutcome(
      { id: 't4', referencePrice: 100, targetPrice: 120, conviction: 9, horizonDays: 730 },
      50, // predicted +20%, actually -50%
    );
    // real ratio is -2.5, clamped to -1
    expect(result.outcomeScore).toBeCloseTo(-44.396, 2); // -1 * 9 * sqrt(730/30)
  });

  it('treats a flat call (target equals reference) as neutral, not a division by zero', () => {
    const result = service.computeOutcome(
      { id: 't5', referencePrice: 100, targetPrice: 100, conviction: 7, horizonDays: 90 },
      110,
    );
    expect(result.targetReturn).toBe(0);
    expect(result.outcomeScore).toBe(0);
    expect(Number.isFinite(result.outcomeScore)).toBe(true);
  });

  it('scores a correct bearish call using the same direction logic as a bullish one', () => {
    const result = service.computeOutcome(
      { id: 't6', referencePrice: 100, targetPrice: 80, conviction: 6, horizonDays: 365 },
      85, // predicted -20%, actually -15% - right direction, most of the way there
    );
    expect(result.targetReturn).toBeCloseTo(-0.2, 5);
    expect(result.actualReturn).toBeCloseTo(-0.15, 5);
    // accuracy 0.75 * conviction 6 * sqrt(365/30) ≈ 15.698
    expect(result.outcomeScore).toBeCloseTo(15.698, 2);
    expect(result.outcomeScore).toBeGreaterThan(0);
  });

  it('gives a longer horizon meaningfully more weight than a short one, all else equal', () => {
    const shortHorizon = service.computeOutcome(
      { id: 't7', referencePrice: 100, targetPrice: 120, conviction: 8, horizonDays: 30 },
      120,
    );
    const longHorizon = service.computeOutcome(
      { id: 't8', referencePrice: 100, targetPrice: 120, conviction: 8, horizonDays: 730 },
      120,
    );
    expect(longHorizon.outcomeScore).toBeGreaterThan(shortHorizon.outcomeScore);
  });
});

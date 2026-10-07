import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { firstPriceOnOrAfter } from '../market-data/price-history';

export interface ThesisForEvaluation {
  id: string;
  referencePrice: number;
  targetPrice: number;
  conviction: number;
  horizonDays: number;
}

export interface ComputedOutcome {
  evaluationPrice: number;
  targetReturn: number;
  actualReturn: number;
  outcomeScore: number;
}

// Direction and magnitude matter, but so does patience and conviction —
// this is the scoring described from the very start of this project:
// "conviction × horizon length × accuracy, rewarding patient analysis
// over lucky short calls." See docs/decisions/005 for the full
// reasoning behind this specific formula.
@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Pure — no I/O, so the scoring math itself can be tested with known
  // inputs and hand-checked expected outputs, completely separate from
  // whatever finds theses and prices in the database.
  computeOutcome(thesis: ThesisForEvaluation, evaluationPrice: number): ComputedOutcome {
    const targetReturn = (thesis.targetPrice - thesis.referencePrice) / thesis.referencePrice;
    const actualReturn = (evaluationPrice - thesis.referencePrice) / thesis.referencePrice;

    // How much of the predicted move actually happened, as a ratio.
    // Same sign as targetReturn means the direction was right; the
    // magnitude says how much of it was captured. A flat call (target
    // equals reference) has no direction to be right or wrong about,
    // so it's scored as neutral rather than dividing by zero.
    const accuracyRatio = targetReturn === 0 ? 0 : actualReturn / targetReturn;

    // Clamped so one wild outlier (a call that overshot its target by
    // 10x, or moved catastrophically the wrong way) can't dominate a
    // score the way an unbounded ratio would.
    const clampedAccuracy = Math.max(-1, Math.min(2, accuracyRatio));

    // sqrt, not linear — a 2-year call gets meaningfully more credit
    // than a 1-month one for being patient, but not so much more that
    // horizon length alone could dominate the score regardless of
    // whether the call was actually right.
    const horizonWeight = Math.sqrt(thesis.horizonDays / 30);

    const outcomeScore = clampedAccuracy * thesis.conviction * horizonWeight;

    return {
      evaluationPrice,
      targetReturn,
      actualReturn,
      outcomeScore,
    };
  }

  // The whole point of the Price table existing since Phase 5 — this is
  // the first place it actually gets read back, not just written to.
  async evaluatePendingTheses(): Promise<{ evaluated: number; stillPending: number }> {
    const candidates = await this.prisma.thesis.findMany({
      where: { status: 'ACTIVE' },
    });

    let evaluated = 0;
    let stillPending = 0;

    for (const thesis of candidates) {
      const resolveAt = new Date(
        new Date(thesis.publishedAt!).getTime() + thesis.horizonDays * 24 * 60 * 60 * 1000,
      );
      if (resolveAt > new Date()) {
        continue; // horizon hasn't actually passed yet - not an error, just not due
      }

      // The real price closest to (at or after) the resolve date - not
      // an estimate, not today's price, the actual market price from
      // around when this call was supposed to have played out.
      // On a trading day: NGX's own trade date where the row has one
      // (price-history.ts), so a late run can't shift which close counts.
      const priceAtResolve = await firstPriceOnOrAfter(this.prisma, thesis.securityId, resolveAt);

      if (!priceAtResolve) {
        // No price data reaches far enough yet - the daily market-data
        // job hasn't caught up to this thesis's resolve date. Try again
        // next run rather than guessing or using a stale price.
        stillPending += 1;
        continue;
      }

      const outcome = this.computeOutcome(
        {
          id: thesis.id,
          referencePrice: Number(thesis.referencePrice),
          targetPrice: Number(thesis.targetPrice),
          conviction: thesis.conviction,
          horizonDays: thesis.horizonDays,
        },
        Number(priceAtResolve.price),
      );

      // Both writes happen together or not at all - a thesis marked
      // EVALUATED with no outcome record (or vice versa) would be a
      // genuinely confusing, hard-to-recover state.
      await this.prisma.$transaction([
        this.prisma.thesisOutcome.create({
          data: {
            thesisId: thesis.id,
            evaluationPrice: outcome.evaluationPrice,
            targetReturn: outcome.targetReturn,
            actualReturn: outcome.actualReturn,
            outcomeScore: outcome.outcomeScore,
          },
        }),
        this.prisma.thesis.update({
          where: { id: thesis.id },
          data: { status: 'EVALUATED' },
        }),
      ]);

      evaluated += 1;
    }

    this.logger.log(`Evaluated ${evaluated} theses. ${stillPending} still awaiting price data.`);
    return { evaluated, stillPending };
  }
}

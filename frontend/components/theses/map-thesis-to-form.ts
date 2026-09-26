import type { Thesis } from '@/lib/theses';
import type { ThesisFormValues } from '@/lib/thesis-schema';

// Prisma returns Decimal fields as strings over the wire (e.g.
// targetPrice: "1350.00") — the form needs real numbers. One small,
// explicit mapper rather than scattering Number(...) calls through the
// form component itself.
export function mapThesisToFormValues(thesis: Thesis): ThesisFormValues {
  return {
    ticker: thesis.security.ticker,
    statement: thesis.statement,
    targetPrice: Number(thesis.targetPrice),
    conviction: thesis.conviction,
    horizonDays: thesis.horizonDays,
    bullCase: thesis.bullCase ?? '',
    baseCase: thesis.baseCase ?? '',
    bearCase: thesis.bearCase ?? '',
    catalysts: thesis.catalysts ?? '',
    risks: thesis.risks ?? '',
    invalidationCondition: thesis.invalidationCondition ?? '',
    metrics: thesis.metrics.map(({ label, value }) => ({ label, value })),
  };
}

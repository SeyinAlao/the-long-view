import type { ThesisOutcome } from '@/lib/theses';

interface ThesisOutcomeCardProps {
  outcome: ThesisOutcome;
}

function getVerdict(targetReturn: number, actualReturn: number): { label: string; tone: 'brass' | 'terracotta' } {
  if (targetReturn === 0) {
    return { label: 'No clear direction called', tone: 'brass' };
  }
  const sameDirection = Math.sign(targetReturn) === Math.sign(actualReturn);
  if (!sameDirection) {
    return { label: 'Wrong direction', tone: 'terracotta' };
  }
  const captured = actualReturn / targetReturn;
  if (captured >= 0.8) {
    return { label: 'Right', tone: 'brass' };
  }
  return { label: 'Right direction, target not reached', tone: 'brass' };
}

export function ThesisOutcomeCard({ outcome }: ThesisOutcomeCardProps) {
  const targetReturn = Number(outcome.targetReturn);
  const actualReturn = Number(outcome.actualReturn);
  const verdict = getVerdict(targetReturn, actualReturn);

  return (
    <div className="mt-8 border-2 border-ink/20 p-6">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] uppercase tracking-[0.1em] text-muted">The record</p>
        <span
          className={
            verdict.tone === 'terracotta'
              ? 'text-sm font-medium text-terracotta'
              : 'text-sm font-medium text-brass-dark'
          }
        >
          {verdict.label}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Evaluated at</p>
          <p className="font-mono text-sm">₦{outcome.evaluationPrice}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Called move</p>
          <p className="font-mono text-sm">{(targetReturn * 100).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Actual move</p>
          <p className="font-mono text-sm">{(actualReturn * 100).toFixed(1)}%</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        Evaluated {new Date(outcome.evaluatedAt).toLocaleDateString()}
      </p>
    </div>
  );
}

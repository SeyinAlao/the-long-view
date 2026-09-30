import type { CounterThesis } from '@/lib/theses';
import { formatDate } from '@/lib/format-date';

interface CounterThesisCardProps {
  counter: CounterThesis;
}

export function CounterThesisCard({ counter }: CounterThesisCardProps) {
  return (
    <div className="border-l-2 border-terracotta/40 py-4 pl-4">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium text-ink">@{counter.author.username}</p>
        <span className="shrink-0 text-xs text-muted">
          {formatDate(counter.publishedAt)}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink/90">{counter.reasoning}</p>
      <div className="mt-2 flex gap-4 font-mono text-xs text-muted">
        <span>Target ₦{counter.targetPrice}</span>
        <span>Conviction {counter.conviction}/10</span>
      </div>
      {counter.risks && (
        <p className="mt-2 text-xs leading-relaxed text-ink/60">
          <span className="font-medium text-ink/80">Risks: </span>
          {counter.risks}
        </p>
      )}
    </div>
  );
}

import Link from 'next/link';
import type { Thesis } from '@/lib/theses';

interface ThesisFeedCardProps {
  thesis: Thesis;
}

export function ThesisFeedCard({ thesis }: ThesisFeedCardProps) {
  return (
    <Link
      href={`/theses/${thesis.id}`}
      className="block border-b border-ink/10 py-5 transition-opacity hover:opacity-70"
    >
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-sm font-medium">{thesis.security.ticker}</span>
          <span className="text-xs text-muted">by @{thesis.author.username}</span>
        </div>
        <span className="shrink-0 text-xs text-muted">
          {thesis.publishedAt ? new Date(thesis.publishedAt).toLocaleDateString() : ''}
        </span>
      </div>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink/90">{thesis.statement}</p>
      <div className="mt-2 flex gap-4 font-mono text-xs text-muted">
        <span>Target ₦{thesis.targetPrice}</span>
        <span>Conviction {thesis.conviction}/10</span>
      </div>
    </Link>
  );
}

import Link from 'next/link';
import type { Thesis } from '@/lib/theses';
import { formatDate } from '@/lib/format-date';

interface ThesisFeedCardProps {
  thesis: Thesis;
}

// Roughly three lines at this width. The feed is for scanning: a
// statement can run to 4,000 characters, and the whole card already
// links to the full thesis. Cut at a word boundary, and done in the
// text itself rather than hidden with CSS, so a screen reader hears the
// same short excerpt instead of the entire statement as a link's name.
const EXCERPT_LENGTH = 280;

function excerpt(text: string): string {
  if (text.length <= EXCERPT_LENGTH) return text;
  const cut = text.slice(0, EXCERPT_LENGTH);
  const lastSpace = cut.lastIndexOf(' ');
  // Drop trailing punctuation so a cut after a full stop reads
  // "the leader…", not "the leader.…".
  const trimmed = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd().replace(/[.,;:!?—–-]+$/, '');
  return `${trimmed}…`;
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
          {thesis.publishedAt ? formatDate(thesis.publishedAt) : ''}
        </span>
      </div>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink/90">{excerpt(thesis.statement)}</p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-xs text-muted">
        <span>Target ₦{thesis.targetPrice}</span>
        <span>Conviction {thesis.conviction}/10</span>
        <span className="text-ink/80 underline underline-offset-4">Read the full thesis →</span>
      </div>
    </Link>
  );
}

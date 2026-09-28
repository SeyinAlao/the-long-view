import type { LeaderboardEntry } from '@/lib/leaderboard';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

const formatScore = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}`;
const formatPercent = (n: number) => `${Math.round(n * 100)}%`;

// Mobile shows rank, author and score, with calls and hit rate folded
// into a line under the name — nothing is dropped on a small screen,
// just moved. From sm up, those become their own columns.
const GRID = 'grid grid-cols-[2.5rem_1fr_4.5rem] sm:grid-cols-[3rem_1fr_5rem_5rem_4rem_5rem] gap-x-4';

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  return (
    <div className="mt-8">
      <div
        className={`${GRID} border-b border-ink/20 pb-2 text-[11px] uppercase tracking-[0.08em] text-muted`}
      >
        <span>#</span>
        <span>Author</span>
        <span className="text-right">Score</span>
        <span className="hidden text-right sm:block">Avg</span>
        <span className="hidden text-right sm:block">Calls</span>
        <span className="hidden text-right sm:block">Right</span>
      </div>

      {entries.map((entry) => (
        <div key={entry.author.id} className={`${GRID} items-baseline border-b border-ink/10 py-4`}>
          <span className="font-display text-2xl text-muted">{entry.rank}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">@{entry.author.username}</p>
            <p className="truncate text-xs text-muted">{entry.author.name}</p>
            <p className="mt-1 font-mono text-[11px] text-muted sm:hidden">
              {entry.evaluatedCount} {entry.evaluatedCount === 1 ? 'call' : 'calls'} ·{' '}
              {formatPercent(entry.hitRate)} right
            </p>
          </div>
          <span
            className={`text-right font-mono text-sm ${entry.totalScore < 0 ? 'text-terracotta' : 'text-brass-dark'}`}
          >
            {formatScore(entry.totalScore)}
          </span>
          <span className="hidden text-right font-mono text-sm text-ink/80 sm:block">
            {formatScore(entry.averageScore)}
          </span>
          <span className="hidden text-right font-mono text-sm text-ink/80 sm:block">
            {entry.evaluatedCount}
          </span>
          <span className="hidden text-right font-mono text-sm text-ink/80 sm:block">
            {formatPercent(entry.hitRate)}
          </span>
        </div>
      ))}
    </div>
  );
}

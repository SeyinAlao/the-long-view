import Link from 'next/link';
import { fetchLeaderboard } from '@/lib/leaderboard';
import { LeaderboardTable } from '@/components/leaderboard/leaderboard-table';

// Same reason as the feed: this fetches from the backend, which isn't
// running while `next build` prerenders static pages.
export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const entries = await fetchLeaderboard();

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-lg tracking-[0.08em]">THE LONG VIEW</span>
        <Link href="/feed" className="text-[11px] text-muted hover:underline">
          Back to the ledger
        </Link>
      </div>
      <div className="mt-2 border-t border-ink/20" />

      <p className="mt-10 text-[11px] uppercase tracking-[0.1em] text-muted">The record</p>
      <h1 className="font-display mt-2 text-4xl">Who&apos;s been right.</h1>
      <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink/80">
        Ranked by cumulative score — direction, conviction and patience all count, and a wrong call
        costs more the more confidence was staked on it. Only calls that have reached their horizon
        and been graded against real prices appear here.
      </p>

      {entries.length === 0 ? (
        <p className="py-10 text-sm text-muted">
          Nothing has been graded yet. Rankings appear when the first published call reaches its
          horizon.
        </p>
      ) : (
        <LeaderboardTable entries={entries} />
      )}
    </main>
  );
}

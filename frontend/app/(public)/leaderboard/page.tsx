import { fetchLeaderboard } from '@/lib/leaderboard';
import { loadForCachedPage } from '@/lib/cached-page-data';
import { LeaderboardList } from '@/components/leaderboard/leaderboard-list';
import { LiveLeaderboard } from '@/components/leaderboard/live-leaderboard';

// Cached at Vercel's edge and regenerated in the background at most
// every 5 minutes (ADR 013). Rankings only change after the evening
// evaluation job. A literal: Next.js requires one here.
export const revalidate = 300;

export default async function LeaderboardPage() {
  const entries = await loadForCachedPage(fetchLeaderboard);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
      <p className="text-[11px] uppercase tracking-[0.1em] text-muted">The record</p>
      <h1 className="font-display mt-2 text-4xl">Who&apos;s been right.</h1>
      <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink/80">
        Ranked by cumulative score — direction, conviction and patience all count, and a wrong call
        costs more the more confidence was staked on it. Only calls that have reached their horizon
        and been graded against real prices appear here.
      </p>

      {entries ? <LeaderboardList entries={entries} /> : <LiveLeaderboard />}
    </main>
  );
}

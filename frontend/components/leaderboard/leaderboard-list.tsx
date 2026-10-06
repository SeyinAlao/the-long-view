import type { LeaderboardEntry } from '@/lib/leaderboard';
import { LeaderboardTable } from './leaderboard-table';

// The Leaderboard's rankings, whichever way the data arrived: rendered
// on the server into the cached page, or fetched in the browser when the
// build couldn't reach the API (LiveLeaderboard).
export function LeaderboardList({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="py-10 text-sm text-muted">
        Nothing has been graded yet. Rankings appear when the first published call reaches its horizon.
      </p>
    );
  }
  return <LeaderboardTable entries={entries} />;
}

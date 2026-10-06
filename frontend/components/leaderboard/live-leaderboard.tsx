'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchLeaderboard } from '@/lib/leaderboard';
import { LiveListStatus } from '@/components/ui/live-list-status';
import { LeaderboardList } from './leaderboard-list';

// The rankings loaded in the browser, for a cached page built while the
// API was unavailable. The first regeneration replaces it with the
// server-rendered rankings.
export function LiveLeaderboard() {
  const { data, isError, refetch } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => fetchLeaderboard(),
  });
  if (!data) return <LiveListStatus failed={isError} onRetry={() => refetch()} />;
  return <LeaderboardList entries={data} />;
}

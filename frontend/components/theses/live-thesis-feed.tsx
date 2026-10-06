'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchPublishedTheses } from '@/lib/theses';
import { LiveListStatus } from '@/components/ui/live-list-status';
import { ThesisFeedList } from './thesis-feed-list';

// The Ledger's list loaded in the browser, for a cached page built while
// the API was unavailable. The first regeneration replaces it with the
// server-rendered list.
export function LiveThesisFeed() {
  const { data, isError, refetch } = useQuery({
    queryKey: ['theses', 'published'],
    queryFn: () => fetchPublishedTheses(),
  });
  if (!data) return <LiveListStatus failed={isError} onRetry={() => refetch()} />;
  return <ThesisFeedList theses={data} />;
}

'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Client Component boundary for all server-state management. Every data
// fetch in this app goes through a useQuery/useMutation hook that reads
// from this client — never a raw useEffect + fetch. The QueryClient is
// created once via useState (not module scope, which would leak across
// requests on the server; not useEffect, which would create it a frame
// too late).
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

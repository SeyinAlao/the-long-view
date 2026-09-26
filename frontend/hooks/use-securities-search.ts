'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchSecurities } from '@/lib/securities';

// Hand-rolled debounce rather than a library — this is the one place in
// the app that needs it, and the whole thing is four lines.
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function useSecuritiesSearch(query: string) {
  const debouncedQuery = useDebouncedValue(query, 200);

  return useQuery({
    queryKey: ['securities', 'search', debouncedQuery],
    queryFn: () => searchSecurities(debouncedQuery),
    staleTime: 60 * 1000,
  });
}

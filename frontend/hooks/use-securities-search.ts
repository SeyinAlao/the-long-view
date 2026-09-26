'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchSecurities } from '@/lib/securities';

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

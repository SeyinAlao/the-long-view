'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCounterThesis, type CreateCounterThesisInput } from '@/lib/theses';

export function useCreateCounterThesis(thesisId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCounterThesisInput) => createCounterThesis(thesisId, input),
    onSuccess: () => {
      // The detail page's own server-rendered data won't know about
      // this yet — invalidating here means if anything on this page
      // ever moves to a client-side fetch later, it picks up the new
      // counter immediately rather than showing stale state.
      queryClient.invalidateQueries({ queryKey: ['theses', thesisId] });
    },
  });
}

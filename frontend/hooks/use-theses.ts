'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createThesis,
  updateThesis,
  publishThesis,
  discardThesis,
  fetchMyTheses,
  fetchThesis,
  type CreateThesisInput,
} from '@/lib/theses';

export function useMyTheses() {
  return useQuery({
    queryKey: ['theses', 'mine'],
    queryFn: fetchMyTheses,
  });
}

export function useThesis(id: string) {
  return useQuery({
    queryKey: ['theses', id],
    queryFn: () => fetchThesis(id),
    enabled: !!id,
  });
}

export function useSaveDraft(existingId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateThesisInput) =>
      existingId ? updateThesis(existingId, input) : createThesis(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theses', 'mine'] });
    },
  });
}

export function usePublish(existingId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateThesisInput) => {
      const thesis = existingId ? await updateThesis(existingId, input) : await createThesis(input);
      return publishThesis(thesis.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theses', 'mine'] });
    },
  });
}

export function useDiscardDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => discardThesis(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theses', 'mine'] });
    },
  });
}
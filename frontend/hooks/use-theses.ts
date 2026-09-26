'use client';

import { useMutation } from '@tanstack/react-query';
import { createThesis, publishThesis, type CreateThesisInput } from '@/lib/theses';

export function useCreateDraft() {
  return useMutation({
    mutationFn: (input: CreateThesisInput) => createThesis(input),
  });
}

// Publishing from a blank form is one user action but two API calls -
// create the draft, then immediately lock it. Modeled as its own
// mutation so the form doesn't have to juggle chaining two mutation
// objects together by hand.
export function useCreateAndPublish() {
  return useMutation({
    mutationFn: async (input: CreateThesisInput) => {
      const draft = await createThesis(input);
      return publishThesis(draft.id);
    },
  });
}

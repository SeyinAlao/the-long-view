'use client';

import { useState } from 'react';
import { useSaveDraft, usePublish } from './use-theses';
import type { CreateThesisInput } from '@/lib/theses';
import type { ThesisFormValues } from '@/lib/thesis-schema';

export function useThesisSubmission(existingId: string | undefined, onSubmitStart: () => void) {
  const [lastAction, setLastAction] = useState<'draft' | 'publish' | null>(null);
  const saveDraftMutation = useSaveDraft(existingId);
  const publishMutation = usePublish(existingId);

  function buildPayload(values: ThesisFormValues): CreateThesisInput {
    return {
      ticker: values.ticker,
      statement: values.statement,
      targetPrice: values.targetPrice,
      conviction: values.conviction,
      horizonDays: values.horizonDays,
      bullCase: values.bullCase || undefined,
      baseCase: values.baseCase || undefined,
      bearCase: values.bearCase || undefined,
      catalysts: values.catalysts || undefined,
      risks: values.risks || undefined,
      invalidationCondition: values.invalidationCondition || undefined,
      metrics: values.metrics?.filter((m) => m.label.trim() && m.value.trim()),
    };
  }

  function saveDraft(values: ThesisFormValues) {
    setLastAction('draft');
    onSubmitStart();
    saveDraftMutation.mutate(buildPayload(values));
  }

  function publish(values: ThesisFormValues) {
    setLastAction('publish');
    onSubmitStart();
    publishMutation.mutate(buildPayload(values));
  }

  // Tracked explicitly rather than derived from .isPending, which flips
  // back to false the instant an error resolves — deriving from that
  // would show the wrong mutation's error after a failed publish.
  const activeMutation = lastAction === 'publish' ? publishMutation : saveDraftMutation;

  return {
    saveDraft,
    publish,
    isPending: saveDraftMutation.isPending || publishMutation.isPending,
    isSavingDraft: saveDraftMutation.isPending,
    isPublishing: publishMutation.isPending,
    isSuccess: saveDraftMutation.isSuccess || publishMutation.isSuccess,
    successVariant: (publishMutation.isSuccess ? 'published' : 'draft') as 'published' | 'draft',
    isError: activeMutation.isError,
    error: activeMutation.error,
  };
}

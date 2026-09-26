'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { thesisFormSchema, type ThesisFormValues } from '@/lib/thesis-schema';
import { useCreateDraft, useCreateAndPublish } from '@/hooks/use-theses';
import { apiErrorMessage } from '@/lib/api';
import { TheCallSection } from './sections/the-call-section';
import { TheNumbersSection } from './sections/the-numbers-section';
import { TheScenariosSection } from './sections/the-scenarios-section';
import { TheEvidenceSection } from './sections/the-evidence-section';
import { ThesisSubmittedView } from './thesis-submitted-view';

export function ThesisForm() {
  const [showMore, setShowMore] = useState(false);
  const [lastAction, setLastAction] = useState<'draft' | 'publish' | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ThesisFormValues>({
    resolver: zodResolver(thesisFormSchema),
    defaultValues: { conviction: 7, horizonDays: 180, metrics: [] },
  });

  const saveDraft = useCreateDraft();
  const createAndPublish = useCreateAndPublish();
  const isPending = saveDraft.isPending || createAndPublish.isPending;
  const activeMutation = lastAction === 'publish' ? createAndPublish : saveDraft;

  function buildPayload(values: ThesisFormValues) {
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

  const onSaveDraft = handleSubmit((values) => {
    setLastAction('draft');
    saveDraft.mutate(buildPayload(values));
  });

  const onPublish = handleSubmit((values) => {
    setLastAction('publish');
    createAndPublish.mutate(buildPayload(values));
  });

  if (saveDraft.isSuccess || createAndPublish.isSuccess) {
    return <ThesisSubmittedView variant={createAndPublish.isSuccess ? 'published' : 'draft'} />;
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
      <p className="text-[11px] uppercase tracking-[0.1em] text-muted">New thesis</p>
      <h1 className="font-display mt-2 text-4xl tracking-[-0.01em]">Make the reasoning legible.</h1>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink/80">
        A clear call has a reference price, a time horizon, and a way to be proven wrong. Save a
        draft as you think. Publish when the record is ready.
      </p>

      <div className="mt-8 border-t border-ink/20" />

      <form className="mt-8 space-y-8">
        <TheCallSection control={control} register={register} errors={errors} />
        <TheNumbersSection control={control} register={register} errors={errors} />

        {!showMore && (
          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            onClick={() => setShowMore(true)}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-ink/25 px-5 py-3 text-sm font-medium text-ink/70 transition-colors hover:border-brass hover:text-ink"
          >
            <i className="bx bx-plus text-base" aria-hidden="true" />
            Add scenarios and evidence — optional, strengthens your case
          </motion.button>
        )}

        <AnimatePresence initial={false}>
          {showMore && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={
                shouldReduceMotion ? { duration: 0.01 } : { type: 'spring', damping: 28, stiffness: 300 }
              }
              className="space-y-8 overflow-hidden"
            >
              <TheScenariosSection register={register} />
              <TheEvidenceSection control={control} register={register} />
            </motion.div>
          )}
        </AnimatePresence>

        {activeMutation.isError && (
          <p className="text-sm text-terracotta" role="alert">
            {apiErrorMessage(activeMutation.error)}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-ink/20 pt-6">
          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            onClick={onSaveDraft}
            disabled={isPending}
            className="rounded-full border border-ink/20 px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink/5 disabled:opacity-40"
          >
            {saveDraft.isPending ? 'Saving…' : 'Save private draft'}
          </motion.button>
          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            onClick={onPublish}
            disabled={isPending}
            className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {createAndPublish.isPending ? 'Publishing…' : 'Publish thesis'}
          </motion.button>
        </div>
      </form>
    </div>
  );
}

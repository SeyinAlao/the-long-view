import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { apiErrorMessage } from '@/lib/api';

interface ThesisFormActionsProps {
  onSaveDraft: () => void;
  onPublish: () => void;
  isPending: boolean;
  isSavingDraft: boolean;
  isPublishing: boolean;
  isError: boolean;
  error: unknown;
  // The publish confirmation (PublishConfirmation), shown above the buttons.
  confirmation: ReactNode;
}

export function ThesisFormActions({
  onSaveDraft,
  onPublish,
  isPending,
  isSavingDraft,
  isPublishing,
  isError,
  error,
  confirmation,
}: ThesisFormActionsProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <>
      {confirmation}
      {isError && (
        <p className="text-sm text-terracotta-dark" role="alert">
          {apiErrorMessage(error)}
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
          {isSavingDraft ? 'Saving…' : 'Save private draft'}
        </motion.button>
        <motion.button
          type="button"
          whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
          onClick={onPublish}
          disabled={isPending}
          className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {isPublishing ? 'Publishing…' : 'Publish thesis'}
        </motion.button>
      </div>
    </>
  );
}

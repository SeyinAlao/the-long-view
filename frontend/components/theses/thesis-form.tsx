'use client';

import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { thesisFormSchema, type ThesisFormValues } from '@/lib/thesis-schema';
import { useThesisSubmission } from '@/hooks/use-thesis-submission';
import { useThesisDraftAutosave } from '@/hooks/use-thesis-draft-autosave';
import { mapThesisToFormValues } from './map-thesis-to-form';
import { TheCallSection } from './sections/the-call-section';
import { TheNumbersSection } from './sections/the-numbers-section';
import { ThesisSubmittedView } from './thesis-submitted-view';
import { RestoreDraftBanner } from './restore-draft-banner';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { ThesisFormActions } from './thesis-form-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { PublishConfirmation } from './publish-confirmation';
import { MUST_CONFIRM_PUBLISH } from '@/lib/legal';
import type { Thesis } from '@/lib/theses';

const TheScenariosSection = dynamic(
  () => import('./sections/the-scenarios-section').then((m) => m.TheScenariosSection),
  { loading: () => <Skeleton className="h-24 w-full" /> },
);
const TheEvidenceSection = dynamic(
  () => import('./sections/the-evidence-section').then((m) => m.TheEvidenceSection),
  { loading: () => <Skeleton className="h-40 w-full" /> },
);

interface ThesisFormProps {
  // Present when editing a previously saved draft; absent when
  // starting a brand new one.
  existingThesis?: Thesis;
}

export function ThesisForm({ existingThesis }: ThesisFormProps) {
  const isEditing = !!existingThesis;

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ThesisFormValues>({
    resolver: zodResolver(thesisFormSchema),
    defaultValues: existingThesis
      ? mapThesisToFormValues(existingThesis)
      : { conviction: 7, horizonDays: 180, metrics: [] },
  });

  const autosave = useThesisDraftAutosave({ watch, reset, isEditing });
  const submission = useThesisSubmission(existingThesis?.id, autosave.clear);

  const [confirmed, setConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const confirmBox = useRef<HTMLInputElement>(null);

  const onSaveDraft = handleSubmit(submission.saveDraft);
  // Publishing needs the confirmation ticked first (ADR 014). Unticked,
  // the button explains why and moves focus to the box.
  const onPublish = () => {
    if (!confirmed) {
      setConfirmError(MUST_CONFIRM_PUBLISH);
      confirmBox.current?.focus();
      return;
    }
    void handleSubmit(submission.publish)();
  };

  if (submission.isSuccess) {
    return <ThesisSubmittedView variant={submission.successVariant} />;
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
      <p className="text-[11px] uppercase tracking-[0.1em] text-muted">
        {isEditing ? 'Editing draft' : 'New thesis'}
      </p>
      <h1 className="font-display mt-2 text-4xl tracking-[-0.01em]">Make the reasoning legible.</h1>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink/80">
        A clear call has a reference price, a time horizon, and a way to be proven wrong. Save a
        draft as you think. Publish when the record is ready.
      </p>

      {autosave.showBanner && (
        <RestoreDraftBanner onRestore={autosave.restore} onDismiss={autosave.dismiss} />
      )}

      <div className="mt-8 border-t border-ink/20" />

      <form className="mt-8 space-y-8">
        <TheCallSection
          control={control}
          register={register}
          errors={errors}
          initialTicker={existingThesis?.security.ticker}
        />
        <TheNumbersSection control={control} register={register} errors={errors} />

        <CollapsibleSection label="Add scenarios and evidence — optional, strengthens your case">
          <TheScenariosSection register={register} />
          <TheEvidenceSection control={control} register={register} />
        </CollapsibleSection>

        <ThesisFormActions
          onSaveDraft={onSaveDraft}
          onPublish={onPublish}
          isPending={submission.isPending}
          isSavingDraft={submission.isSavingDraft}
          isPublishing={submission.isPublishing}
          isError={submission.isError}
          error={submission.error}
          confirmation={
            <PublishConfirmation
              checked={confirmed}
              onChange={(value) => {
                setConfirmed(value);
                if (value) setConfirmError(null);
              }}
              error={confirmError}
              inputRef={confirmBox}
            />
          }
        />
      </form>
    </div>
  );
}

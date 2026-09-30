'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, useReducedMotion } from 'framer-motion';
import { counterThesisFormSchema, type CounterThesisFormValues } from '@/lib/thesis-schema';
import { useCreateCounterThesis } from '@/hooks/use-counter-theses';
import { apiErrorMessage } from '@/lib/api';
import { ConvictionSlider } from './conviction-slider';
import { HorizonPicker } from './horizon-picker';
import { fieldClass } from './field-styles';

interface CounterThesisFormProps {
  thesisId: string;
  onPublished: () => void;
}

// Deliberately smaller than the main thesis form — a counter has no
// bull/base/bear split, no metrics table, no evidence section. It's a
// real, locked call (hence the same 80-character reasoning bar, and the
// same react-hook-form + zod setup), just a narrower one.
export function CounterThesisForm({ thesisId, onPublished }: CounterThesisFormProps) {
  const shouldReduceMotion = useReducedMotion();
  const publish = useCreateCounterThesis(thesisId);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CounterThesisFormValues>({
    resolver: zodResolver(counterThesisFormSchema),
    defaultValues: { conviction: 5, horizonDays: 90 },
  });

  const onSubmit = handleSubmit((values) => {
    publish.mutate(
      {
        targetPrice: values.targetPrice,
        conviction: values.conviction,
        horizonDays: values.horizonDays,
        reasoning: values.reasoning,
        risks: values.risks || undefined,
        assumptions: values.assumptions || undefined,
      },
      { onSuccess: onPublished },
    );
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 border-l-2 border-ink/15 pl-4">
      <div>
        <label htmlFor="reasoning" className="text-sm text-ink/80">
          Why you disagree
        </label>
        <textarea
          id="reasoning"
          rows={3}
          placeholder="What does this call get wrong, and what would you say instead?"
          className={fieldClass}
          {...register('reasoning')}
        />
        {errors.reasoning && (
          <p className="mt-1 text-xs text-terracotta-dark" role="alert">
            {errors.reasoning.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="counterTargetPrice" className="text-sm text-ink/80">
          Your target price
        </label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
            ₦
          </span>
          <input
            id="counterTargetPrice"
            type="number"
            step="0.01"
            min="0.01"
            className="no-spinner w-full rounded-md border border-ink/20 bg-cream py-2 pl-7 pr-3 text-sm text-ink focus:border-brass"
            {...register('targetPrice', { valueAsNumber: true })}
          />
        </div>
        {errors.targetPrice && (
          <p className="mt-1 text-xs text-terracotta-dark" role="alert">
            {errors.targetPrice.message}
          </p>
        )}
      </div>

      <Controller
        name="conviction"
        control={control}
        render={({ field }) => <ConvictionSlider value={field.value} onChange={field.onChange} />}
      />
      <Controller
        name="horizonDays"
        control={control}
        render={({ field }) => <HorizonPicker value={field.value} onChange={field.onChange} />}
      />

      <div>
        <label htmlFor="counterRisks" className="text-sm text-ink/80">
          Risks to your view (optional)
        </label>
        <textarea id="counterRisks" rows={2} className={fieldClass} {...register('risks')} />
      </div>

      {publish.isError && (
        <p className="text-sm text-terracotta-dark" role="alert">
          {apiErrorMessage(publish.error)}
        </p>
      )}

      <motion.button
        type="submit"
        whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
        disabled={publish.isPending}
        className="rounded-full bg-terracotta-dark px-5 py-3 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {publish.isPending ? 'Publishing…' : 'Publish counter-thesis'}
      </motion.button>
    </form>
  );
}

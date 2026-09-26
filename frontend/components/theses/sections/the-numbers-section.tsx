'use client';

import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { ConvictionSlider } from '../conviction-slider';
import { HorizonPicker } from '../horizon-picker';
import type { ThesisFormValues } from '@/lib/thesis-schema';

interface TheNumbersSectionProps {
  control: Control<ThesisFormValues>;
  register: UseFormRegister<ThesisFormValues>;
  errors: FieldErrors<ThesisFormValues>;
}

export function TheNumbersSection({ control, register, errors }: TheNumbersSectionProps) {
  return (
    <section>
      <p className="text-[11px] uppercase tracking-[0.1em] text-brass-dark">02 · The numbers</p>
      <div className="mt-3 space-y-5">
        <div>
          <label htmlFor="targetPrice" className="text-sm text-ink/80">
            Target price
          </label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
              ₦
            </span>
            <input
              id="targetPrice"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="1,350"
              className="no-spinner w-full rounded-md border border-ink/20 bg-cream py-2 pl-7 pr-3 text-sm text-ink outline-none focus:border-brass"
              {...register('targetPrice', { valueAsNumber: true })}
            />
          </div>
          {errors.targetPrice && (
            <p className="mt-1 text-xs text-terracotta" role="alert">
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
      </div>
    </section>
  );
}

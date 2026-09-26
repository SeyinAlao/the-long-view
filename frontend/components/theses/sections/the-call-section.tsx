'use client';

import { useState } from 'react';
import { Controller, useWatch, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { SecurityCombobox } from '../security-combobox';
import { fieldClass } from '../field-styles';
import type { ThesisFormValues } from '@/lib/thesis-schema';
import type { Security } from '@/lib/securities';

const STATEMENT_MIN = 80;

interface TheCallSectionProps {
  control: Control<ThesisFormValues>;
  register: UseFormRegister<ThesisFormValues>;
  errors: FieldErrors<ThesisFormValues>;
}

export function TheCallSection({ control, register, errors }: TheCallSectionProps) {
  // The combobox needs the full Security object to render "TICKER —
  // Company Name"; the form itself only ever needs the ticker string.
  // Kept separate on purpose rather than stuffing the whole object into
  // form state for one field that only submits as a string.
  const [selectedSecurity, setSelectedSecurity] = useState<Security | null>(null);
  const statement = useWatch({ control, name: 'statement' }) ?? '';

  return (
    <section>
      <p className="text-[11px] uppercase tracking-[0.1em] text-brass-dark">01 · The call</p>
      <div className="mt-3 space-y-4">
        <Controller
          name="ticker"
          control={control}
          render={({ field }) => (
            <SecurityCombobox
              value={selectedSecurity}
              onChange={(security) => {
                setSelectedSecurity(security);
                field.onChange(security.ticker);
              }}
              error={errors.ticker?.message}
            />
          )}
        />

        <div>
          <label htmlFor="statement" className="text-sm text-ink/80">
            The thesis
          </label>
          <textarea
            id="statement"
            rows={4}
            placeholder="What do you believe, why now, and what will the market eventually see?"
            className={fieldClass}
            {...register('statement')}
          />
          <p className="mt-1 text-xs text-muted">
            {statement.length} characters. Minimum {STATEMENT_MIN}.
          </p>
          {errors.statement && (
            <p className="mt-1 text-xs text-terracotta" role="alert">
              {errors.statement.message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

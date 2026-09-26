'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Controller, useWatch, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { SecurityCombobox } from '../security-combobox';
import { fieldClass } from '../field-styles';
import { fetchSecurityByTicker } from '@/lib/securities';
import type { ThesisFormValues } from '@/lib/thesis-schema';
import type { Security } from '@/lib/securities';

const STATEMENT_MIN = 80;

interface TheCallSectionProps {
  control: Control<ThesisFormValues>;
  register: UseFormRegister<ThesisFormValues>;
  errors: FieldErrors<ThesisFormValues>;
  // Set when editing an existing draft, or restoring an auto-saved one
  // — the form already knows the ticker, but the combobox needs the
  // full Security object to show "TICKER — Company Name" rather than
  // just sitting empty despite a real value being selected underneath.
  initialTicker?: string;
}

export function TheCallSection({ control, register, errors, initialTicker }: TheCallSectionProps) {
  // Only set once the user explicitly picks something via the combobox.
  // Until then, fall back to whatever the initial ticker resolves to —
  // derived during render, not synced in via an effect (an effect that
  // just copies one piece of state into another is exactly the
  // cascading-render pattern React's own guidance says to avoid).
  const [pickedSecurity, setPickedSecurity] = useState<Security | null>(null);
  const statement = useWatch({ control, name: 'statement' }) ?? '';

  const { data: resolvedInitial } = useQuery({
    queryKey: ['securities', 'byTicker', initialTicker],
    queryFn: () => fetchSecurityByTicker(initialTicker!),
    enabled: !!initialTicker && !pickedSecurity,
  });

  const selectedSecurity = pickedSecurity ?? resolvedInitial ?? null;

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
                setPickedSecurity(security);
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

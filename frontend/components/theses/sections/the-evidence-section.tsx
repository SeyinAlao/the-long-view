'use client';

import { useState } from 'react';
import { Controller, type Control, type UseFormRegister } from 'react-hook-form';
import { MetricsEditor, type MetricRow } from '../metrics-editor';
import { fieldClass } from '../field-styles';
import type { ThesisFormValues } from '@/lib/thesis-schema';

interface TheEvidenceSectionProps {
  control: Control<ThesisFormValues>;
  register: UseFormRegister<ThesisFormValues>;
}

export function TheEvidenceSection({ control, register }: TheEvidenceSectionProps) {
  // Same reasoning as the security/ticker split in TheCallSection: the
  // editor needs a stable `id` per row to animate add/remove correctly,
  // but the form (and the backend) only ever wants {label, value} pairs.
  // The id is UI bookkeeping, not form data.
  const [rows, setRows] = useState<MetricRow[]>([]);

  return (
    <section>
      <p className="text-[11px] uppercase tracking-[0.1em] text-brass-dark">04 · The evidence</p>
      <div className="mt-3 space-y-4">
        <Controller
          name="metrics"
          control={control}
          render={({ field }) => (
            <MetricsEditor
              metrics={rows}
              onChange={(next) => {
                setRows(next);
                field.onChange(next.map(({ label, value }) => ({ label, value })));
              }}
            />
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="catalysts" className="text-sm text-ink/80">
              Catalysts
            </label>
            <textarea
              id="catalysts"
              rows={3}
              placeholder="Results, price reviews, corporate actions…"
              className={fieldClass}
              {...register('catalysts')}
            />
          </div>
          <div>
            <label htmlFor="risks" className="text-sm text-ink/80">
              Risks
            </label>
            <textarea
              id="risks"
              rows={3}
              placeholder="What could go wrong?"
              className={fieldClass}
              {...register('risks')}
            />
          </div>
        </div>

        <div>
          <label htmlFor="invalidationCondition" className="text-sm text-ink/80">
            Invalidation
          </label>
          <textarea
            id="invalidationCondition"
            rows={2}
            placeholder="What would make you change your mind?"
            className={fieldClass}
            {...register('invalidationCondition')}
          />
        </div>
      </div>
    </section>
  );
}

'use client';

import type { UseFormRegister } from 'react-hook-form';
import { fieldClass } from '../field-styles';
import type { ThesisFormValues } from '@/lib/thesis-schema';

interface TheScenariosSectionProps {
  register: UseFormRegister<ThesisFormValues>;
}

export function TheScenariosSection({ register }: TheScenariosSectionProps) {
  return (
    <section>
      <p className="text-[11px] uppercase tracking-[0.1em] text-brass-dark">03 · The scenarios</p>
      <div className="mt-3 space-y-4">
        <div>
          <label htmlFor="bullCase" className="text-sm text-ink/80">
            Bull case
          </label>
          <textarea
            id="bullCase"
            rows={2}
            placeholder="What goes right?"
            className={fieldClass}
            {...register('bullCase')}
          />
        </div>
        <div>
          <label htmlFor="baseCase" className="text-sm text-ink/80">
            Base case
          </label>
          <textarea
            id="baseCase"
            rows={2}
            placeholder="What happens if the business compounds steadily?"
            className={fieldClass}
            {...register('baseCase')}
          />
        </div>
        <div>
          <label htmlFor="bearCase" className="text-sm text-ink/80">
            Bear case
          </label>
          <textarea
            id="bearCase"
            rows={2}
            placeholder="What does the market underestimate on the downside?"
            className={fieldClass}
            {...register('bearCase')}
          />
        </div>
      </div>
    </section>
  );
}

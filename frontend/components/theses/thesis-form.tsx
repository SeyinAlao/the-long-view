'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { SecurityCombobox } from './security-combobox';
import { MetricsEditor, type MetricRow } from './metrics-editor';
import { useCreateDraft, useCreateAndPublish } from '@/hooks/use-theses';
import { apiErrorMessage } from '@/lib/api';
import type { Security } from '@/lib/securities';

const STATEMENT_MIN = 80;
const HORIZON_OPTIONS = [
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
  { label: '6 months', days: 180 },
  { label: '9 months', days: 270 },
  { label: '1 year', days: 365 },
  { label: '2 years', days: 730 },
];

const textareaClass =
  'mt-1 w-full rounded-md border border-ink/20 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-brass';
const inputClass = textareaClass;

export function ThesisForm() {
  const [security, setSecurity] = useState<Security | null>(null);
  const [statement, setStatement] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [conviction, setConviction] = useState(7);
  const [horizonDays, setHorizonDays] = useState(180);
  const [bullCase, setBullCase] = useState('');
  const [baseCase, setBaseCase] = useState('');
  const [bearCase, setBearCase] = useState('');
  const [catalysts, setCatalysts] = useState('');
  const [risks, setRisks] = useState('');
  const [invalidationCondition, setInvalidationCondition] = useState('');
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [securityError, setSecurityError] = useState<string | undefined>();

  const saveDraft = useCreateDraft();
  const createAndPublish = useCreateAndPublish();
  const shouldReduceMotion = useReducedMotion();

  const activeMutation = createAndPublish.isPending ? createAndPublish : saveDraft;
  const isPending = saveDraft.isPending || createAndPublish.isPending;
  const isPublished = createAndPublish.isSuccess;
  const isDrafted = saveDraft.isSuccess && !isPublished;

  function buildPayload() {
    return {
      ticker: security!.ticker,
      statement,
      targetPrice: Number(targetPrice),
      conviction,
      horizonDays,
      bullCase: bullCase || undefined,
      baseCase: baseCase || undefined,
      bearCase: bearCase || undefined,
      catalysts: catalysts || undefined,
      risks: risks || undefined,
      invalidationCondition: invalidationCondition || undefined,
      metrics: metrics
        .filter((m) => m.label.trim() && m.value.trim())
        .map(({ label, value }) => ({ label, value })),
    };
  }

  function handleSubmit(e: FormEvent, action: 'draft' | 'publish') {
    e.preventDefault();
    setSecurityError(undefined);

    if (!security) {
      setSecurityError('Choose a security before saving.');
      return;
    }

    const payload = buildPayload();
    if (action === 'draft') {
      saveDraft.mutate(payload);
    } else {
      createAndPublish.mutate(payload);
    }
  }

  if (isPublished || isDrafted) {
    return (
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0.01 } : { type: 'spring', damping: 22, stiffness: 260 }}
        className="mx-auto max-w-md px-5 py-24 text-center"
      >
        <p className="text-[11px] uppercase tracking-[0.1em] text-muted">
          {isPublished ? 'Published' : 'Saved as a private draft'}
        </p>
        <h1 className="font-display mt-2 text-3xl">
          {isPublished ? 'Locked. The record is keeping time.' : 'Still yours to shape.'}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink/80">
          {isPublished
            ? "This thesis can't be edited from here on — that's the whole point."
            : 'Drafts stay private until you publish. You can come back and finish this one anytime.'}
        </p>
        {/* Points at /dashboard for now — becomes a link straight to this
            thesis's own page once the detail view exists. */}
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition-opacity hover:opacity-90"
        >
          Back to your desk
        </Link>
      </motion.div>
    );
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
        <section>
          <p className="text-[11px] uppercase tracking-[0.1em] text-brass-dark">01 · The call</p>
          <div className="mt-3 space-y-4">
            <SecurityCombobox value={security} onChange={setSecurity} error={securityError} />
            <div>
              <label htmlFor="statement" className="text-sm text-ink/80">
                The thesis
              </label>
              <textarea
                id="statement"
                rows={4}
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="What do you believe, why now, and what will the market eventually see?"
                className={textareaClass}
              />
              <p className="mt-1 text-xs text-muted">
                {statement.length} characters. Minimum {STATEMENT_MIN}.
              </p>
            </div>
          </div>
        </section>

        <section>
          <p className="text-[11px] uppercase tracking-[0.1em] text-brass-dark">02 · The numbers</p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="targetPrice" className="text-sm text-ink/80">
                Target price
              </label>
              <input
                id="targetPrice"
                type="number"
                step="0.01"
                min="0.01"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="1,350"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="conviction" className="text-sm text-ink/80">
                Conviction
              </label>
              <input
                id="conviction"
                type="number"
                min={1}
                max={10}
                value={conviction}
                onChange={(e) => setConviction(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="horizonDays" className="text-sm text-ink/80">
                Horizon
              </label>
              <select
                id="horizonDays"
                value={horizonDays}
                onChange={(e) => setHorizonDays(Number(e.target.value))}
                className={inputClass}
              >
                {HORIZON_OPTIONS.map((opt) => (
                  <option key={opt.days} value={opt.days}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

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
                value={bullCase}
                onChange={(e) => setBullCase(e.target.value)}
                placeholder="What goes right?"
                className={textareaClass}
              />
            </div>
            <div>
              <label htmlFor="baseCase" className="text-sm text-ink/80">
                Base case
              </label>
              <textarea
                id="baseCase"
                rows={2}
                value={baseCase}
                onChange={(e) => setBaseCase(e.target.value)}
                placeholder="What happens if the business compounds steadily?"
                className={textareaClass}
              />
            </div>
            <div>
              <label htmlFor="bearCase" className="text-sm text-ink/80">
                Bear case
              </label>
              <textarea
                id="bearCase"
                rows={2}
                value={bearCase}
                onChange={(e) => setBearCase(e.target.value)}
                placeholder="What does the market underestimate on the downside?"
                className={textareaClass}
              />
            </div>
          </div>
        </section>

        <section>
          <p className="text-[11px] uppercase tracking-[0.1em] text-brass-dark">04 · The evidence</p>
          <div className="mt-3 space-y-4">
            <MetricsEditor metrics={metrics} onChange={setMetrics} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="catalysts" className="text-sm text-ink/80">
                  Catalysts
                </label>
                <textarea
                  id="catalysts"
                  rows={3}
                  value={catalysts}
                  onChange={(e) => setCatalysts(e.target.value)}
                  placeholder="Results, price reviews, corporate actions…"
                  className={textareaClass}
                />
              </div>
              <div>
                <label htmlFor="risks" className="text-sm text-ink/80">
                  Risks
                </label>
                <textarea
                  id="risks"
                  rows={3}
                  value={risks}
                  onChange={(e) => setRisks(e.target.value)}
                  placeholder="What could go wrong?"
                  className={textareaClass}
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
                value={invalidationCondition}
                onChange={(e) => setInvalidationCondition(e.target.value)}
                placeholder="What would make you change your mind?"
                className={textareaClass}
              />
            </div>
          </div>
        </section>

        {activeMutation.isError && (
          <p className="text-sm text-terracotta" role="alert">
            {apiErrorMessage(activeMutation.error)}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-ink/20 pt-6">
          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            onClick={(e) => handleSubmit(e, 'draft')}
            disabled={isPending || statement.length < STATEMENT_MIN}
            className="rounded-full border border-ink/20 px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink/5 disabled:opacity-40"
          >
            {saveDraft.isPending ? 'Saving…' : 'Save private draft'}
          </motion.button>
          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            onClick={(e) => handleSubmit(e, 'publish')}
            disabled={isPending || statement.length < STATEMENT_MIN}
            className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {createAndPublish.isPending ? 'Publishing…' : 'Publish thesis'}
          </motion.button>
        </div>
      </form>
    </div>
  );
}

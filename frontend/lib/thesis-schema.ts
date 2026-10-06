import { z } from 'zod';

// Zod would otherwise probe whether it may compile validators with
// new Function(). The Content Security Policy forbids that, and browsers
// report even a caught probe as a violation (ADR 011). jitless skips the
// probe; validation works the same, without the compiled fast path.
z.config({ jitless: true });

// Mirrors the backend's CreateThesisDto (backend/src/theses/dto) field
// for field. This isn't a coincidence to maintain by hand forever — it's
// the same shape on purpose, so a validation error reads the same way
// on both sides. If the backend DTO changes, this should change with it.
export const thesisMetricSchema = z.object({
  label: z.string().min(1, 'Required').max(60),
  value: z.string().min(1, 'Required').max(120),
});

export const thesisFormSchema = z.object({
  // `error` covers the field being empty (never picked); .min covers an
  // empty string. Both should read the same to the person filling it in.
  ticker: z.string({ error: 'Choose a security.' }).min(1, 'Choose a security.'),
  statement: z
    .string()
    .min(80, 'At least 80 characters.')
    .max(4000, 'Keep it under 4000 characters.'),
  // Plain z.number(), not z.coerce.number() — coerce makes the schema's
  // input type diverge from its output type (unknown vs number), which
  // react-hook-form's resolver typing can't reconcile against a form
  // typed with the output shape. Kept the schema's types unambiguous
  // instead; targetPrice's <input> converts its own string value via
  // valueAsNumber, conviction/horizonDays are already numbers by the
  // time their Controllers call onChange.
  // An empty number field reaches Zod as NaN - a type error, not "too
  // small" - so without `error` here people saw raw validator text:
  // "Invalid input: expected number, received NaN".
  targetPrice: z.number({ error: 'Enter a target price.' }).positive('Enter a target price.'),
  conviction: z.number().int().min(1).max(10),
  horizonDays: z.number().int().min(1).max(1825),
  bullCase: z.string().max(2000).optional().or(z.literal('')),
  baseCase: z.string().max(2000).optional().or(z.literal('')),
  bearCase: z.string().max(2000).optional().or(z.literal('')),
  catalysts: z.string().max(2000).optional().or(z.literal('')),
  risks: z.string().max(2000).optional().or(z.literal('')),
  invalidationCondition: z.string().max(2000).optional().or(z.literal('')),
  metrics: z.array(thesisMetricSchema).max(10).optional(),
});

export type ThesisFormValues = z.infer<typeof thesisFormSchema>;

// Mirrors the backend's CreateCounterThesisDto — same reasoning as
// thesisFormSchema above about keeping these two shapes in sync
// deliberately, not coincidentally.
export const counterThesisFormSchema = z.object({
  targetPrice: z.number({ error: 'Enter a target price.' }).positive('Enter a target price.'),
  conviction: z.number().int().min(1).max(10),
  horizonDays: z.number().int().min(1).max(1825),
  reasoning: z
    .string()
    .min(80, 'At least 80 characters.')
    .max(4000, 'Keep it under 4000 characters.'),
  risks: z.string().max(2000).optional().or(z.literal('')),
  assumptions: z.string().max(2000).optional().or(z.literal('')),
});

export type CounterThesisFormValues = z.infer<typeof counterThesisFormSchema>;

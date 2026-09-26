import { z } from 'zod';

export const thesisMetricSchema = z.object({
  label: z.string().min(1, 'Required').max(60),
  value: z.string().min(1, 'Required').max(120),
});

export const thesisFormSchema = z.object({
  ticker: z.string().min(1, 'Choose a security.'),
  statement: z
    .string()
    .min(80, 'At least 80 characters.')
    .max(4000, 'Keep it under 4000 characters.'),
  targetPrice: z.number().positive('Enter a target price.'),
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

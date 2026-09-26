import { apiFetch } from './api';

export interface ThesisMetricInput {
  label: string;
  value: string;
}

export interface CreateThesisInput {
  ticker: string;
  statement: string;
  targetPrice: number;
  conviction: number;
  horizonDays: number;
  bullCase?: string;
  baseCase?: string;
  bearCase?: string;
  catalysts?: string;
  risks?: string;
  invalidationCondition?: string;
  metrics?: ThesisMetricInput[];
}

export interface Thesis {
  id: string;
  status: 'DRAFT' | 'ACTIVE' | 'EVALUATED';
  ticker?: string;
  targetPrice: string;
  referencePrice: string | null;
  conviction: number;
  horizonDays: number;
  statement: string;
  publishedAt: string | null;
}

export function createThesis(input: CreateThesisInput) {
  return apiFetch<Thesis>('/theses', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function publishThesis(id: string) {
  return apiFetch<Thesis>(`/theses/${id}/publish`, { method: 'POST' });
}

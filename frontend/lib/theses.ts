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

// Matches the real shape the backend returns — THESIS_INCLUDE in
// theses.service.ts always attaches security and metrics, so callers
// never have to fetch those separately.
export interface CounterThesis {
  id: string;
  targetPrice: string;
  conviction: number;
  horizonDays: number;
  reasoning: string;
  risks: string | null;
  assumptions: string | null;
  publishedAt: string;
  author: { id: string; username: string; name: string };
}

export interface Thesis {
  id: string;
  status: 'DRAFT' | 'ACTIVE' | 'EVALUATED';
  securityId: string;
  security: { ticker: string; companyName: string };
  author: { id: string; username: string; name: string };
  targetPrice: string;
  referencePrice: string | null;
  conviction: number;
  horizonDays: number;
  statement: string;
  bullCase: string | null;
  baseCase: string | null;
  bearCase: string | null;
  catalysts: string | null;
  risks: string | null;
  invalidationCondition: string | null;
  metrics: { id: string; label: string; value: string }[];
  // Only present when fetched via findOne (the detail page) — the feed
  // and "my theses" list don't fetch this, to avoid over-fetching on
  // every row of a list.
  counterTheses?: CounterThesis[];
  publishedAt: string | null;
  createdAt: string;
}

export interface CreateCounterThesisInput {
  targetPrice: number;
  conviction: number;
  horizonDays: number;
  reasoning: string;
  risks?: string;
  assumptions?: string;
}

export function createCounterThesis(thesisId: string, input: CreateCounterThesisInput) {
  return apiFetch<CounterThesis>(`/theses/${thesisId}/counter`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function createThesis(input: CreateThesisInput) {
  return apiFetch<Thesis>('/theses', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateThesis(id: string, input: Partial<CreateThesisInput>) {
  return apiFetch<Thesis>(`/theses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function publishThesis(id: string) {
  return apiFetch<Thesis>(`/theses/${id}/publish`, { method: 'POST' });
}

export function discardThesis(id: string) {
  return apiFetch<{ success: boolean }>(`/theses/${id}`, { method: 'DELETE' });
}

export function fetchPublishedTheses(ticker?: string) {
  const params = ticker ? `?ticker=${encodeURIComponent(ticker)}` : '';
  return apiFetch<Thesis[]>(`/theses${params}`);
}

export function fetchMyTheses() {
  return apiFetch<Thesis[]>('/theses/mine');
}

export function fetchThesis(id: string) {
  return apiFetch<Thesis>(`/theses/${id}`);
}

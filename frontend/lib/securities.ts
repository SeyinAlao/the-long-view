import { apiFetch } from './api';

export interface Security {
  id: string;
  ticker: string;
  companyName: string;
  sector: string | null;
  currentPrice: string;
  previousPrice: string | null;
}

export function searchSecurities(query: string) {
  const params = query ? `?q=${encodeURIComponent(query)}` : '';
  return apiFetch<Security[]>(`/securities${params}`);
}

// Used to pre-populate the combobox's display when a ticker is already
// known but the full Security object isn't — editing an existing draft,
// or restoring one from the local auto-save.
export function fetchSecurityByTicker(ticker: string) {
  return apiFetch<Security>(`/securities/${ticker}`);
}

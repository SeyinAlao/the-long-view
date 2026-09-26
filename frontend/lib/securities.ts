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

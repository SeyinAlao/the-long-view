import { expect, type APIRequestContext } from '@playwright/test';
import { statementFor } from './thesis-form';

// Setup data through the API, for tests where writing a thesis is not
// what's being tested. `api` carries whoever is signed in: page.request
// shares the tab's cookies; the `request` fixture has its own.
export async function createThesis(
  api: APIRequestContext,
  { ticker, label, publish }: { ticker: string; label: string; publish: boolean },
): Promise<string> {
  const created = await api.post('/api/theses', {
    data: { ticker, statement: statementFor(label), targetPrice: 300, conviction: 7, horizonDays: 180 },
  });
  expect(created.status(), await created.text()).toBe(201);
  const { id } = (await created.json()) as { id: string };
  if (publish) {
    const published = await api.post(`/api/theses/${id}/publish`);
    expect(published.ok(), await published.text()).toBe(true);
  }
  return id;
}

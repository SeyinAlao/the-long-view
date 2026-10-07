import { expect, type APIRequestContext } from '@playwright/test';
import { statementFor } from './thesis-form';
import { addPrice } from './db';
import { newAccount } from './accounts';

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
    const published = await api.post(`/api/theses/${id}/publish`, { data: { confirmed: true } });
    expect(published.ok(), await published.text()).toBe(true);
  }
  return id;
}

// A published MTNN thesis by a new account, signed in on `api`. For
// tests that only need a public thesis to exist.
export async function publishedThesis(api: APIRequestContext, label: string): Promise<string> {
  await addPrice('MTNN', 250);
  const registered = await api.post('/api/auth/register', { data: newAccount(`${label.toLowerCase()}_author`) });
  expect(registered.status(), await registered.text()).toBe(201);
  return createThesis(api, { ticker: 'MTNN', label, publish: true });
}

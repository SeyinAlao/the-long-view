import { expect, type APIRequestContext } from '@playwright/test';
import { RELAY_URL } from './env';

// Sets the relay's state (support/relay.mjs) and fails the test at once
// if the relay refuses it, rather than carrying on with the old setting.
export async function setRelay(request: APIRequestContext, query: string): Promise<void> {
  const res = await request.post(`${RELAY_URL}/__relay?${query}`);
  expect(res.ok(), `relay refused ?${query}: ${await res.text()}`).toBe(true);
}

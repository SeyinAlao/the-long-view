import { test as base } from '@playwright/test';
import { closeDatabase, resetDatabase } from './db';
import { RELAY_URL } from './env';

// Every spec imports `test` from here instead of @playwright/test, so
// each test starts and ends with empty tables and an undelayed API -
// no test can see another's users, theses or relay setting.
export const test = base.extend<{ isolation: void }, { databasePool: void }>({
  databasePool: [
    async ({}, use) => {
      await use();
      await closeDatabase();
    },
    { scope: 'worker', auto: true },
  ],
  isolation: [
    async ({ request }, use) => {
      await request.post(`${RELAY_URL}/__relay?delayMs=0`);
      await resetDatabase();
      await use();
      await request.post(`${RELAY_URL}/__relay?delayMs=0`);
      await resetDatabase();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';

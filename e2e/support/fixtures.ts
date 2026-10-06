import { test as base, expect } from '@playwright/test';
import { closeDatabase, resetDatabase } from './db';
import { setRelay } from './relay-control';

// Every spec imports `test` from here instead of @playwright/test, so
// each test starts and ends with empty tables and an undelayed API -
// no test can see another's users, theses or relay setting - and fails
// if any page it opened broke the Content Security Policy (ADR 011).
export const test = base.extend<{ isolation: void; cspGuard: void }, { databasePool: void }>({
  databasePool: [
    async ({}, use) => {
      await use();
      await closeDatabase();
    },
    { scope: 'worker', auto: true },
  ],
  isolation: [
    async ({ request }, use) => {
      await setRelay(request, 'delayMs=0');
      await resetDatabase();
      await use();
      await setRelay(request, 'delayMs=0');
      await resetDatabase();
    },
    { auto: true },
  ],
  // Browsers fire `securitypolicyviolation` for anything the policy
  // blocks (or, in Report-Only, would block). The binding outlives page
  // loads, so a violation on any page the test visits is caught.
  cspGuard: [
    async ({ page }, use) => {
      const violations: string[] = [];
      await page.exposeBinding('__reportCspViolation', (_source, violation: string) => {
        violations.push(violation);
      });
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (event) => {
          const report = (window as unknown as { __reportCspViolation: (v: string) => void }).__reportCspViolation;
          report(`${event.effectiveDirective} blocked ${event.blockedURI || 'inline'} on ${location.pathname}`);
        });
      });
      await use();
      expect(violations, 'Content Security Policy violations').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';

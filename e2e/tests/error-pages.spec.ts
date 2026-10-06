import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { API_TIMEOUT_MS } from '../support/env';
import { setRelay as relay } from '../support/relay-control';
import { expectNoAxeViolations } from '../support/a11y';
import { publishedThesis } from '../support/theses-api';

// When the API fails, a page rendered on every request shows this app's
// own error page inside the normal layout - header and navigation still
// there - and "Try again" recovers once the API is back. A waking API is
// not a failure: the skeleton stays up until the server-side timeout.
// A thesis page is the public example. The cached Ledger and
// Leaderboard keep their last good page instead (cached-pages.spec.ts).
const errorHeading = (page: Page) => page.getByRole('heading', { name: "This page couldn't load." });
const thesisHeading = (page: Page) => page.getByRole('heading', { name: 'MTN Nigeria Communications Plc' });

test('a thesis page: a failing API shows the error page in the site, and Try again recovers', async ({
  page,
  request,
}) => {
  const id = await publishedThesis(request, 'Recover');
  await relay(request, 'fail=503');
  await page.goto(`/theses/${id}`);

  await expect(errorHeading(page)).toBeVisible();
  await expect(page.locator('header').getByRole('link', { name: 'Ledger' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to the front page' })).toBeVisible();
  await expectNoAxeViolations(page, 'thesis error page');

  await relay(request, 'delayMs=0');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(thesisHeading(page)).toBeVisible();
  await expect(errorHeading(page)).toHaveCount(0);
});

test('an API that drops the connection shows the error page, not a broken one', async ({ page, request }) => {
  const id = await publishedThesis(request, 'Dropped');
  await relay(request, 'fail=drop');
  await page.goto(`/theses/${id}`);
  await expect(errorHeading(page)).toBeVisible();
});

const notFoundHeading = (page: Page) => page.getByRole('heading', { name: "This page isn't on the record." });

// The thesis route must tell "no such thesis" (the API's own 404) apart
// from "the API failed": only the first is a not-found page.
for (const status of [500, 503]) {
  test(`a published thesis shows the error page when the API answers ${status}, not "not on the record"`, async ({
    page,
    request,
  }) => {
    const id = await publishedThesis(request, 'Outage');
    await relay(request, `fail=${status}`);
    await page.goto(`/theses/${id}`);

    await expect(errorHeading(page)).toBeVisible();
    await expect(notFoundHeading(page)).toHaveCount(0);
  });
}

// The HTTP status is 200, not 404: the route's loading.tsx starts the
// stream before the thesis is looked up, and a status can't change once
// streaming has begun. Next.js marks the page noindex instead (its docs:
// loading.js, "Status codes"), which is what this checks.
test('a thesis the API genuinely says is missing (404) still shows the not-found page', async ({ page }) => {
  await page.goto('/theses/no-such-thesis');

  await expect(notFoundHeading(page)).toBeVisible();
  await expect(errorHeading(page)).toHaveCount(0);
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
});

test('a slow API keeps the skeleton until the timeout, and only then shows the error page', async ({
  page,
  request,
}) => {
  test.setTimeout(API_TIMEOUT_MS + 30_000);
  const id = await publishedThesis(request, 'Slow');
  await relay(request, `delayMs=${API_TIMEOUT_MS + 15_000}`);
  const started = Date.now();
  await page.goto(`/theses/${id}`, { waitUntil: 'commit' });

  const skeleton = page.locator('main[aria-busy="true"]');
  await expect(skeleton).toBeVisible({ timeout: 1_500 });

  // Most of the way to the timeout: still the skeleton, no error.
  await page.waitForTimeout(Math.max(0, API_TIMEOUT_MS - 3_000 - (Date.now() - started)));
  await expect(skeleton).toBeVisible();
  await expect(errorHeading(page)).toHaveCount(0);

  await expect(errorHeading(page)).toBeVisible({ timeout: 10_000 });
  expect(Date.now() - started).toBeGreaterThanOrEqual(API_TIMEOUT_MS);
});

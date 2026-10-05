import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { API_TIMEOUT_MS } from '../support/env';
import { setRelay as relay } from '../support/relay-control';
import { addPrice } from '../support/db';
import { expectNoAxeViolations } from '../support/a11y';
import { newAccount } from '../support/accounts';
import { createThesis } from '../support/theses-api';

// When the API fails, public pages show this app's own error page inside
// the normal layout - header and navigation still there - and "Try
// again" recovers once the API is back. A waking API is not a failure:
// the skeleton stays up until the server-side timeout.
const errorHeading = (page: Page) => page.getByRole('heading', { name: "This page couldn't load." });

const PAGES = [
  { path: '/feed', heading: 'Published theses.' },
  { path: '/leaderboard', heading: "Who's been right." },
];

for (const { path, heading } of PAGES) {
  test(`${path}: a failing API shows the error page in the site, and Try again recovers`, async ({
    page,
    request,
  }) => {
    await relay(request, 'fail=503');
    await page.goto(path);

    await expect(errorHeading(page)).toBeVisible();
    await expect(page.locator('header').getByRole('link', { name: 'Ledger' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to the front page' })).toBeVisible();
    await expectNoAxeViolations(page, `${path} error page`);

    await relay(request, 'delayMs=0');
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await expect(errorHeading(page)).toHaveCount(0);
  });
}

test('an API that drops the connection shows the error page, not a broken one', async ({ page, request }) => {
  await relay(request, 'fail=drop');
  await page.goto('/feed');
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
    await addPrice('MTNN', 250);
    expect((await request.post('/api/auth/register', { data: newAccount('outage_author') })).status()).toBe(201);
    const id = await createThesis(request, { ticker: 'MTNN', label: 'Outage', publish: true });

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
  await relay(request, `delayMs=${API_TIMEOUT_MS + 15_000}`);
  const started = Date.now();
  await page.goto('/feed', { waitUntil: 'commit' });

  const skeleton = page.locator('main[aria-busy="true"]');
  await expect(skeleton).toBeVisible({ timeout: 1_500 });

  // Most of the way to the timeout: still the skeleton, no error.
  await page.waitForTimeout(Math.max(0, API_TIMEOUT_MS - 3_000 - (Date.now() - started)));
  await expect(skeleton).toBeVisible();
  await expect(errorHeading(page)).toHaveCount(0);

  await expect(errorHeading(page)).toBeVisible({ timeout: 10_000 });
  expect(Date.now() - started).toBeGreaterThanOrEqual(API_TIMEOUT_MS);
});

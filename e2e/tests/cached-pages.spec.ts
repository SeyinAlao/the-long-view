import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { E2E_REVALIDATE_SECONDS } from '../support/env';
import { setRelay as relay } from '../support/relay-control';
import { publishedThesis } from '../support/theses-api';
import { statementFor } from '../support/thesis-form';

// The Ledger and Leaderboard are cached and regenerated in the
// background (ISR, ADR 013). Locally `next start` reports the cache in
// `x-nextjs-cache`; on Vercel the edge reports `x-vercel-cache`, checked
// by hand on a Preview.
const cacheState = async (request: APIRequestContext, path: string) =>
  (await request.get(path)).headers()['x-nextjs-cache'];
const errorHeading = (page: Page) => page.getByRole('heading', { name: "This page couldn't load." });
const wait = (seconds: number) => new Promise((done) => setTimeout(done, seconds * 1000 + 500));
const pastRevalidate = () => wait(E2E_REVALIDATE_SECONDS);
// After a failed regeneration Next re-stores the last good page and
// retries once it is stale again: after the page's interval, but at
// least 3s and at most 30s (next/dist/server/response-cache/index.js).
const pastRetry = () => wait(Math.min(Math.max(E2E_REVALIDATE_SECONDS, 3), 30));

// Tries a regeneration while the API is failing, then checks the page
// is still the last good one: stale, still served, never an error page.
async function failOneRegeneration(request: APIRequestContext, path: string) {
  await relay(request, 'fail=503');
  await pastRevalidate();
  await request.get(path); // serves the stale page and regenerates in the background, which fails
  await pastRetry();
  expect(await cacheState(request, path), 'still the stale page after a failed regeneration').toBe('STALE');
}

for (const path of ['/feed', '/leaderboard']) {
  test(`${path} is served from the cache, with the security headers`, async ({ request }) => {
    await request.get(path);
    const res = await request.get(path);
    expect(res.status()).toBe(200);
    expect(res.headers()['x-nextjs-cache']).toMatch(/^(HIT|STALE)$/);
    expect(res.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  });
}

test('a new thesis reaches the cached Ledger at the next regeneration', async ({ page, request }) => {
  await publishedThesis(request, 'Fresh');
  await expect(async () => {
    await page.goto('/feed');
    await expect(page.getByText(statementFor('Fresh'))).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
});

test('when the API fails, the Ledger keeps its last good page and recovers afterwards', async ({ page, request }) => {
  const statement = statementFor('Kept');
  await publishedThesis(request, 'Kept');
  await expect(async () => {
    expect(await (await request.get('/feed')).text()).toContain(statement);
  }).toPass({ timeout: 15_000 });

  await failOneRegeneration(request, '/feed');
  await page.goto('/feed');
  await expect(page.getByText(statement)).toBeVisible();
  await expect(errorHeading(page)).toHaveCount(0);

  // Once the API is back, the next regeneration succeeds: a thesis
  // published now reaches the page.
  await relay(request, 'delayMs=0');
  await publishedThesis(request, 'After');
  await expect(async () => {
    expect(await (await request.get('/feed')).text()).toContain(statementFor('After'));
  }).toPass({ timeout: 15_000 });
});

test('when the API fails, the Leaderboard keeps its last good page', async ({ page, request }) => {
  await failOneRegeneration(request, '/leaderboard');
  await page.goto('/leaderboard');
  await expect(page.getByRole('heading', { name: "Who's been right." })).toBeVisible();
  await expect(page.getByText('Nothing has been graded yet.')).toBeVisible();
  await expect(errorHeading(page)).toHaveCount(0);
});

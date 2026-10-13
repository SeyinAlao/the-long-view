import type { APIRequestContext } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { FAKE_GOOGLE_URL } from '../support/env';
import { addPrice } from '../support/db';
import { newAccount } from '../support/accounts';
import { createThesis } from '../support/theses-api';

// A real Google sign-in round trip in a browser, against the fake Google
// (support/fake-google.mjs): the state cookie is set by /api/auth/google
// through the frontend's rewrite, must come back on Google's redirect to
// /api/auth/google/callback (Path=/), and the person lands where they
// started, after accepting the Terms if the account is new.
const fakeGoogle = async (request: APIRequestContext, query = '') => {
  const res = await request.post(`${FAKE_GOOGLE_URL}/__fake-google?${query}`);
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as { lastAuthorize: Record<string, string> | null };
};

test('the state cookie is set through the /api rewrite: Path=/, HttpOnly, SameSite=Lax', async ({ page }) => {
  const res = await page.request.get('/api/auth/google?next=/feed', { maxRedirects: 0 });

  expect(res.status()).toBe(302);
  const stateCookie = res.headersArray().find((h) => h.name.toLowerCase() === 'set-cookie' && h.value.startsWith('oauth_state='));
  expect(stateCookie?.value).toMatch(/; Path=\//);
  expect(stateCookie?.value).toMatch(/; HttpOnly/);
  expect(stateCookie?.value).toMatch(/; SameSite=Lax/);
  expect(res.headers().location).toContain(`${FAKE_GOOGLE_URL}/o/oauth2/v2/auth?`);
});

test('Google sign-in from a thesis page comes back to that thesis, signed in', async ({ page, request }) => {
  await addPrice('MTNN', 250);
  expect((await request.post('/api/auth/register', { data: newAccount('author') })).status()).toBe(201);
  const thesisId = await createThesis(request, { ticker: 'MTNN', label: 'Round trip', publish: true });
  await fakeGoogle(request, 'sub=g-roundtrip&email=round.trip@example.com&verified=true');

  await page.goto(`/login?next=/theses/${thesisId}`);
  await page.getByRole('link', { name: 'Continue with Google' }).click();

  // A new Google account accepts the Terms first, then carries on (ADR 014).
  await expect(page).toHaveURL(new RegExp(`/welcome/terms\\?next=%2Ftheses%2F${thesisId}$`));
  await page.getByRole('checkbox', { name: /I agree to the Terms of Service/ }).check();
  await page.getByRole('button', { name: 'Agree and continue' }).click();

  await expect(page).toHaveURL(new RegExp(`/theses/${thesisId}$`));
  await expect(page.locator('header').getByRole('button', { name: 'Sign out' })).toBeVisible();
  // One sign-in, one state: the cookie is gone afterwards.
  expect((await page.context().cookies()).map((c) => c.name)).not.toContain('oauth_state');

  const { lastAuthorize } = await fakeGoogle(request, 'sub=g-roundtrip&email=round.trip@example.com&verified=true');
  expect(lastAuthorize?.prompt).toBe('select_account');
  expect(lastAuthorize?.state).toMatch(/^[\w-]{32}$/);
});

test('a callback this browser never started ends on the login page with an explanation', async ({ page }) => {
  await page.goto('/api/auth/google/callback?code=forged&state=forged');

  await expect(page).toHaveURL(/\/login\?error=google$/);
  await expect(page.getByRole('alert').filter({ hasText: "Google sign-in didn't work." })).toBeVisible();
});

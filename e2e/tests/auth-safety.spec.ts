import { test, expect } from '../support/fixtures';
import type { Page } from '@playwright/test';
import { newAccount, signUpWithApi } from '../support/accounts';

const FORGED = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJub2JvZHkifQ.forged-signature';

async function forgeSessionCookie(page: Page) {
  await page.context().addCookies([{ name: 'session_token', value: FORGED, url: 'http://localhost:3000' }]);
}

// Counts page requests, including every redirect hop, so a redirect
// loop shows up as a number rather than only as a browser error. (Not
// framenavigated: Next's router also fires that for a same-page
// history update after load, which is not a navigation.)
function countPageRequests(page: Page) {
  let count = 0;
  page.on('request', (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) count += 1;
  });
  return () => count;
}

test('a protected page with no cookie redirects to sign-in, remembering where you were', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
});

// proxy.ts only checks that a cookie exists; the page must verify it.
// The proxy's redirect would carry ?next=; the page's own does not -
// so a bare /login proves the page itself rejected the cookie.
test('a forged session cookie is rejected by the page itself', async ({ page }) => {
  await forgeSessionCookie(page);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
});

test('a forged session cookie on /login shows the form, with no redirect loop', async ({ page }) => {
  await forgeSessionCookie(page);
  const pageRequests = countPageRequests(page);
  const response = await page.goto('/login');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel('Email')).toBeVisible();
  expect(pageRequests()).toBe(1);
});

test('a real session on /login is sent on to where it was going', async ({ page }) => {
  await signUpWithApi(page, newAccount('signed_in'));
  await page.goto('/login?next=/theses/mine');
  await expect(page).toHaveURL(/\/theses\/mine$/);
  await expect(page.getByRole('heading', { name: 'My research' })).toBeVisible();
});

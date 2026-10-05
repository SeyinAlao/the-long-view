import type { APIRequestContext } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { FRONTEND_PORT } from '../support/env';
import { newAccount, signUpWithApi } from '../support/accounts';

// Signing out ends every session on every device, and the sign-out
// request has no body. So the only thing stopping another website from
// signing someone out everywhere - with a hidden form that posts to
// /api/auth/logout - is the session cookie's SameSite=Lax: the browser
// doesn't send it on a cross-site POST, so the API sees no session and
// ends nobody's. This checks that, in a real browser (Chromium).
//
// It can't check the attribute itself: Chromium treats a cookie with no
// SameSite as Lax anyway (and Playwright reports it as "Lax"), so this
// test passes with the attribute removed. backend/test/sessions.e2e-spec.ts
// checks the Set-Cookie header says SameSite=Lax explicitly, which other
// browsers need.
const ATTACKER = 'http://attacker.test/';
const LOGOUT_URL = `http://localhost:${FRONTEND_PORT}/api/auth/logout`;

test('another site cannot sign you out everywhere with a hidden form', async ({ page, browser, baseURL }) => {
  const account = newAccount('csrf');
  await signUpWithApi(page, account);

  // A second device, signed in to the same account.
  const laptop = await browser.newContext({ baseURL });
  await signIn(laptop.request, account);

  // The other site: a page that submits a form to our sign-out endpoint
  // as soon as it loads. Served by Playwright, so nothing leaves the machine.
  await page.route(ATTACKER, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<form method="post" action="${LOGOUT_URL}"></form><script>document.forms[0].submit()</script>`,
    }),
  );
  const forgedLogout = page.waitForResponse(LOGOUT_URL);
  await page.goto(ATTACKER);
  expect((await forgedLogout).status()).toBe(200); // it reached the API...

  // ...without the cookie, so the other device is still signed in.
  expect((await laptop.request.get('/api/auth/me')).status()).toBe(200);

  // Whereas a real sign-out from this site does end the other session.
  await page.goto('/');
  await signIn(page.request, account);
  expect((await page.request.post('/api/auth/logout')).status()).toBe(200);
  expect((await laptop.request.get('/api/auth/me')).status()).toBe(401);

  await laptop.close();
});

// Signs in through the frontend's /api rewrite; the cookie lands in that
// request context's browser context. Used again before the real sign-out
// because the forged request's response may clear this browser's cookie
// (clearing doesn't need the cookie).
async function signIn(api: APIRequestContext, { email, password }: { email: string; password: string }) {
  const res = await api.post('/api/auth/login', { data: { email, password } });
  expect(res.status(), await res.text()).toBe(200);
}

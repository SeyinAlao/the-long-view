import { test, expect } from '../support/fixtures';
import { expectNoAxeViolations } from '../support/a11y';
import { newAccount, signUpWithApi } from '../support/accounts';

// What people see when Google sign-in sends them back without a session,
// and after it replaced their password. Google itself can't be driven in
// a browser test; backend/test/google-linking.e2e-spec.ts covers the
// redirects these pages receive.
const REFUSED =
  "An account with this email already has published work, so Google sign-in can't be added to it. Sign in with your email and password.";
const FAILED = "Google sign-in didn't work. Try again, or sign in with your email and password.";
const BUSY = 'Too many sign-in attempts from your network. Wait a few minutes, then try again.';
const NOTICE = 'Google is now how you sign in. Your old password no longer works. Your drafts are still here.';

for (const [code, message] of [
  ['google-link-refused', REFUSED],
  ['google', FAILED],
  ['google-busy', BUSY],
] as const) {
  test(`/login?error=${code} explains what happened`, async ({ page }) => {
    await page.goto(`/login?error=${code}`);
    await expect(page.getByRole('alert').filter({ hasText: message })).toBeVisible();
    await expectNoAxeViolations(page, `login, error=${code}`);
  });
}

test('an unknown error code shows nothing', async ({ page }) => {
  await page.goto('/login?error=anything-else');
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await expect(page.getByText(REFUSED)).toHaveCount(0);
  await expect(page.getByText(FAILED)).toHaveCount(0);
});

test('the dashboard says Google is now the sign-in method, only when told to', async ({ page }) => {
  await signUpWithApi(page, newAccount('notice'));

  await page.goto('/dashboard?notice=google-now-sign-in');
  await expect(page.getByRole('status').filter({ hasText: NOTICE })).toBeVisible();
  await expectNoAxeViolations(page, 'dashboard with the Google notice');

  await page.goto('/dashboard?notice=something-else');
  await expect(page.getByRole('heading', { name: /^Welcome,/ })).toBeVisible();
  await expect(page.getByText(NOTICE)).toHaveCount(0);
});

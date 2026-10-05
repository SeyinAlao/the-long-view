import { test, expect } from '../support/fixtures';
import { expectNoAxeViolations } from '../support/a11y';
import { newAccount, signUpWithApi } from '../support/accounts';

// Rate limiting through the whole stack (ADR 010): the browser, the
// frontend's proxy.ts (which adds the edge key), the relay and the API,
// which enforces the key as production will. Per-IP limits need Vercel's
// client IP, so they are proven in backend/test/rate-limit.e2e-spec.ts;
// here, the per-account limit and what a browser can't fake.
const FORGED = {
  'x-tlv-edge-key': 'forged-key-forged-key-forged-key-forged',
  'x-tlv-client-ip': '203.0.113.99',
  'x-tlv-source': 'server',
  'x-forwarded-for': '203.0.113.98',
  'x-real-ip': '203.0.113.97',
};

test('edge headers a browser sends are replaced, not believed', async ({ page }) => {
  const account = newAccount('forger');
  await signUpWithApi(page, account);
  // With the forged key passed on, the API would answer 403.
  const res = await page.request.post('/api/auth/login', {
    headers: FORGED,
    data: { email: account.email, password: account.password },
  });
  expect(res.status(), await res.text()).toBe(200);
});

test('after ten wrong passwords, sign-in says to wait, whatever IP headers the browser sends', async ({ page }) => {
  const account = newAccount('limited');
  await signUpWithApi(page, account);
  await page.context().clearCookies();

  const submit = async (password: string, status: number) => {
    await page.getByLabel('Password').fill(password);
    const response = page.waitForResponse((r) => r.url().endsWith('/api/auth/login'));
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    expect((await response).status()).toBe(status);
  };

  await page.goto('/login');
  await page.getByLabel('Email').fill(account.email);
  for (let i = 0; i < 10; i++) {
    await page.setExtraHTTPHeaders({ ...FORGED, 'x-forwarded-for': `198.51.100.${i}` });
    await submit(`wrong-password-${i}`, 401);
  }
  await expect(page.getByRole('alert').filter({ hasText: 'Invalid email or password' })).toBeVisible();

  await submit(account.password, 429);
  await expect(page.getByRole('alert').filter({ hasText: 'Too many attempts. Try again in 15 minutes.' })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await expectNoAxeViolations(page, 'login, too many attempts');
});

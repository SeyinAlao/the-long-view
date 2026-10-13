import { test, expect } from '../support/fixtures';
import { addPrice, withdrawTermsAcceptance } from '../support/db';
import { expectNoAxeViolations } from '../support/a11y';
import { newAccount, signInWithForm, signUpWithApi } from '../support/accounts';
import { fillThesis, statementFor } from '../support/thesis-form';

// ADR 014: the Terms checkpoint, the publish confirmation and the
// disclaimer, as a person meets them. The API's own refusals are tested
// in backend/test/terms.e2e-spec.ts.
const DISCLAIMER =
  "Each thesis is its author's own opinion, not the operator's recommendation, and is not investment advice.";

test('sign-up needs the Terms box: unticked, it explains, moves focus to the box, and creates nothing', async ({ page }) => {
  const account = newAccount('unticked');
  await page.goto('/signup');
  await page.getByLabel('Name', { exact: true }).fill(account.name);
  await page.getByLabel('Username').fill(account.username);
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  const box = page.getByRole('checkbox', { name: /I agree to the Terms of Service/ });
  await expect(box).not.toBeChecked();

  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Tick the box to agree' })).toBeVisible();
  await expect(box).toBeFocused();
  await expect(page).toHaveURL(/\/signup$/);
  await expectNoAxeViolations(page, 'sign-up, Terms not ticked');

  // The label links both documents and says what a thesis is.
  await expect(page.getByRole('link', { name: 'Terms of Service' }).first()).toHaveAttribute('href', '/terms');
  await expect(page.getByText(DISCLAIMER).first()).toBeVisible();

  await box.check();
  await expect(page.getByRole('alert').filter({ hasText: 'Tick the box to agree' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('an account without the current Terms accepts them first, then carries on to where it was going', async ({ page }) => {
  const account = newAccount('older');
  await signUpWithApi(page, account);
  await withdrawTermsAcceptance(account.username);
  await page.context().clearCookies();

  // Signing in goes to the accept step, then the desk.
  await page.goto('/login');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/welcome\/terms\?next=%2Fdashboard$/);

  // Any page for writing sends them back here, keeping where they were going.
  await page.goto('/theses/new');
  await expect(page).toHaveURL(/\/welcome\/terms\?next=%2Ftheses%2Fnew$/);
  await expectNoAxeViolations(page, 'accept step');

  await page.getByRole('button', { name: 'Agree and continue' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Tick the box to agree' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /I agree to the Terms of Service/ })).toBeFocused();
  await expectNoAxeViolations(page, 'accept step, not ticked');

  await page.getByRole('checkbox', { name: /I agree to the Terms of Service/ }).check();
  await page.getByRole('button', { name: 'Agree and continue' }).click();
  await expect(page).toHaveURL(/\/theses\/new$/);

  // Accepted: the step lets them straight through from now on.
  await page.goto('/welcome/terms?next=/theses/mine');
  await expect(page).toHaveURL(/\/theses\/mine$/);
});

test('publishing needs its confirmation, which says what publishing means', async ({ page }) => {
  await addPrice('MTNN', 250);
  await signUpWithApi(page, newAccount('confirmer'));
  await page.goto('/theses/new');
  await fillThesis(page, { ticker: 'MTNN', statement: statementFor('Confirm'), targetPrice: 300 });

  await expect(page.getByText(DISCLAIMER).first()).toBeVisible();
  const box = page.getByRole('checkbox', { name: /published as my own opinion, not investment advice/ });
  await expect(box).not.toBeChecked();

  await page.getByRole('button', { name: 'Publish thesis' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Tick the box to confirm before publishing.' })).toBeVisible();
  await expect(box).toBeFocused();
  await expectNoAxeViolations(page, 'publish, not confirmed');

  await box.check();
  await page.getByRole('button', { name: 'Publish thesis' }).click();
  await expect(page.getByRole('heading', { name: 'Locked. The record is keeping time.' })).toBeVisible();
});

test('every page carries the disclaimer and links to the Terms and Privacy Policy, which are readable', async ({ page }) => {
  for (const path of ['/', '/feed', '/leaderboard', '/login']) {
    await page.goto(path);
    const footer = page.locator('footer');
    await expect(footer).toContainText(DISCLAIMER);
    await expect(footer.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
    await expect(footer.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
  }

  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: 'Terms of Service', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: '4. Opinions, not investment advice' })).toBeVisible();
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy Policy', level: 1 })).toBeVisible();
});

test('the account still signs in normally once accepted', async ({ page }) => {
  const account = newAccount('accepted');
  await signUpWithApi(page, account);
  await page.context().clearCookies();
  await signInWithForm(page, account);
});

import { test, expect } from '../support/fixtures';
import { publishFromForm } from '../support/thesis-form';
import { addPrice } from '../support/db';
import { expectNoAxeViolations } from '../support/a11y';
import { newAccount, signUpWithApi } from '../support/accounts';
import { createThesis } from '../support/theses-api';

// axe-core, WCAG 2.2 AA, zero violations - on every main page with real
// content in it, signed out and signed in, plus the error states.
test.describe('WCAG 2.2 AA (axe-core)', () => {
  let publishedId: string;

  test.beforeEach(async ({ request }) => {
    await addPrice('MTNN', 250);
    const author = newAccount('a11y_author');
    expect((await request.post('/api/auth/register', { data: author })).status()).toBe(201);
    publishedId = await createThesis(request, { ticker: 'MTNN', label: 'Accessible', publish: true });
  });

  test('public pages, signed out', async ({ page }) => {
    for (const path of ['/', '/feed', '/leaderboard', '/login', '/signup', '/terms', '/privacy', `/theses/${publishedId}`]) {
      await page.goto(path);
      await expect(page.locator('main[aria-busy="true"]')).toHaveCount(0);
      await expectNoAxeViolations(page, path);
    }
  });

  test('sign-in with the wrong password', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByLabel('Password').fill('not-the-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: /\w/ })).toBeVisible(); // not Next's empty announcer
    await expectNoAxeViolations(page, 'sign-in error');
  });

  test('signed-in pages, the empty thesis form, and the open counter form', async ({ page }) => {
    await signUpWithApi(page, newAccount('a11y_reader'));
    const draftId = await createThesis(page.request, { ticker: 'MTNN', label: 'Draft', publish: false });

    for (const path of ['/dashboard', '/theses/mine', '/theses/new', `/theses/${draftId}/edit`]) {
      await page.goto(path);
      await expect(page.locator('main[aria-busy="true"]')).toHaveCount(0);
      await expectNoAxeViolations(page, path);
    }

    await page.goto('/theses/new');
    await publishFromForm(page);
    await expect(page.getByRole('alert').filter({ hasText: /\w/ }).first()).toBeVisible();
    await expectNoAxeViolations(page, 'empty thesis form');

    await page.goto(`/theses/${publishedId}`);
    await page.getByRole('button', { name: /Publish a counter-thesis/ }).click();
    await expect(page.getByLabel('Why you disagree')).toBeVisible();
    await expectNoAxeViolations(page, 'open counter-thesis form');
  });
});

import { test, expect } from '../support/fixtures';
import { addPrice } from '../support/db';
import { newAccount, signOut, signUpWithForm } from '../support/accounts';
import { chooseCompany, fillThesis, saveDraft, statementFor, publishFromForm } from '../support/thesis-form';

// The whole loop, as two real people would do it on one browser:
// write, save, change your mind, publish, and be disagreed with.
test('sign up, draft, re-save, publish, see it on the Ledger, be countered, sign out', async ({ page }) => {
  const author = newAccount('author');
  const critic = newAccount('critic');
  const statement = statementFor('Journey');
  await addPrice('MTNN', 250);
  await addPrice('DANGCEM', 480);

  await signUpWithForm(page, author);

  await page.goto('/theses/new');
  await fillThesis(page, { ticker: 'MTNN', statement, targetPrice: 320 });
  await saveDraft(page);

  // Re-save with a different company: before 1f22d15 this second save
  // always failed with "property ticker should not exist".
  await page.goto('/theses/mine');
  await page.getByRole('link', { name: /MTNN/ }).click();
  await expect(page).toHaveURL(/\/theses\/[^/]+\/edit$/);
  await expect(page.getByRole('combobox', { name: 'Security' })).toHaveValue(/^MTNN —/);
  await chooseCompany(page, 'DANGCEM');
  await saveDraft(page);

  await page.goto('/theses/mine');
  await page.getByRole('link', { name: /DANGCEM/ }).click();
  await expect(page.getByRole('combobox', { name: 'Security' })).toHaveValue(/^DANGCEM —/);
  await publishFromForm(page);
  await expect(page.getByRole('heading', { name: 'Locked. The record is keeping time.' })).toBeVisible();

  // The Ledger is a cached page (ADR 013): the thesis appears once a
  // regeneration has run, seconds later in the test build.
  const card = page.getByRole('link', { name: /DANGCEM/ });
  await expect(async () => {
    await page.goto('/feed');
    await expect(card).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await expect(card).toContainText('Target ₦320');
  await signOut(page);

  await signUpWithForm(page, critic);
  await page.goto('/feed');
  await page.getByRole('link', { name: /DANGCEM/ }).click();
  await expect(page.getByText(`by @${author.username}`)).toBeVisible();
  await expect(page.getByText('₦480', { exact: true })).toBeVisible(); // the locked reference price

  await page.getByRole('button', { name: /Publish a counter-thesis/ }).click();
  await page.getByLabel('Why you disagree').fill(statementFor('Counter'));
  await page.getByLabel('Your target price').fill('400');
  await page.getByRole('button', { name: 'Publish counter-thesis' }).click();
  await expect(page.getByText('The debate (1)')).toBeVisible();
  await expect(page.getByText(`@${critic.username}`).first()).toBeVisible();

  await signOut(page);
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
});

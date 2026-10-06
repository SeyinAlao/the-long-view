import { test, expect } from '../support/fixtures';
import type { Page } from '@playwright/test';
import { addPrice } from '../support/db';
import { newAccount, signUpWithApi } from '../support/accounts';
import { fillThesis, statementFor } from '../support/thesis-form';

// The backend's exact words (theses.service.ts), shown as they come.
const NO_PRICE_MESSAGE =
  "This company doesn't have a current market price yet, so the thesis can't be published - " +
  'its reference price would be wrong, and it can never change once published. ' +
  'Your draft is saved; try again after the next daily price update.';

async function publishAndExpectRefusal(page: Page) {
  await page.getByRole('button', { name: 'Publish thesis' }).click();
  // filter(): Next.js also renders an empty role="alert" route announcer.
  await expect(page.getByRole('alert').filter({ hasText: NO_PRICE_MESSAGE })).toHaveText(NO_PRICE_MESSAGE);
}

async function openTheDraft(page: Page) {
  await page.goto('/theses/mine');
  await expect(page.getByRole('button', { name: 'Drafts (1)' })).toBeVisible();
  await page.getByRole('link', { name: /MTNN/ }).click();
  await expect(page).toHaveURL(/\/edit$/);
}

// ADR 004: the reference price is the newest real price, at most 7 days
// old. Never the seed's ₦100 placeholder, which every company starts on.
// The company search only offers companies with a price row, so the form
// can't reach "no price at all"; backend e2e covers that refusal.
test('publishing is refused without a recent real price, and succeeds with one', async ({ page }) => {
  await signUpWithApi(page, newAccount('pricer'));
  await addPrice('MTNN', 250, 8);

  await page.goto('/theses/new');
  await fillThesis(page, { ticker: 'MTNN', statement: statementFor('Reference'), targetPrice: 300 });
  await publishAndExpectRefusal(page); // only an 8-day-old price

  await openTheDraft(page); // "Your draft is saved" is true
  await publishAndExpectRefusal(page); // still refused after reopening the draft

  await addPrice('MTNN', 262);
  await openTheDraft(page);
  await page.getByRole('button', { name: 'Publish thesis' }).click();
  await expect(page.getByRole('heading', { name: 'Locked. The record is keeping time.' })).toBeVisible();

  await page.goto('/theses/mine');
  await page.getByRole('button', { name: 'Published (1)' }).click();
  await page.getByRole('link', { name: /MTNN/ }).click();
  await expect(page.getByText('₦262', { exact: true })).toBeVisible(); // not ₦100, not ₦250
});

import { test, expect } from '../support/fixtures';
import { newAccount, signUpWithApi } from '../support/accounts';
import { statementFor } from '../support/thesis-form';

// The other half of account switching: the restore offer has to work
// for the person it belongs to. Without this, "B is never offered A's
// writing" would pass even if nobody were ever offered anything.
test('your own unsaved writing is offered back, and Restore puts it in the form', async ({ page }) => {
  const unsaved = statementFor('Come back to this');
  await signUpWithApi(page, newAccount('writer'));

  await page.goto('/theses/new');
  await page.getByLabel('The thesis').fill(unsaved);
  await page.waitForFunction(
    (text) => localStorage.getItem('thesis-draft-in-progress')?.includes(text) ?? false,
    unsaved,
  );

  await page.goto('/theses/new');
  await expect(page.getByText('Found an unsaved draft from last time.')).toBeVisible();
  await expect(page.getByLabel('The thesis')).toHaveValue('');
  await page.getByRole('button', { name: 'Restore' }).click();
  await expect(page.getByLabel('The thesis')).toHaveValue(unsaved);
  await expect(page.getByText('Found an unsaved draft from last time.')).toHaveCount(0);
});

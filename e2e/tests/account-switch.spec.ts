import { test, expect } from '../support/fixtures';
import { addPrice } from '../support/db';
import { newAccount, signInWithForm, signOut, signUpWithForm } from '../support/accounts';
import { fillThesis, saveDraft, statementFor } from '../support/thesis-form';

const AUTOSAVE_KEY = 'thesis-draft-in-progress';

// A shared browser: A writes, signs out, B signs in on the same tab.
// B must see nothing of A's - not A's saved drafts (cached server data)
// and not A's unsaved writing (the autosave in localStorage).
test("after A signs out, B never sees A's drafts or unsaved writing", async ({ page, request }) => {
  const a = newAccount('alice');
  const b = newAccount('bola');
  const savedByA = statementFor('Saved by A');
  const unsavedByA = statementFor('Unsaved by A');
  await addPrice('MTNN', 250);
  // B exists already, created out of band so B's cookie never touches this tab.
  expect((await request.post('/api/auth/register', { data: b })).status()).toBe(201);

  await signUpWithForm(page, a);
  await page.goto('/theses/new');
  await fillThesis(page, { ticker: 'MTNN', statement: savedByA, targetPrice: 300 });
  await saveDraft(page);

  // A starts another thesis and leaves it unsaved; autosave keeps it.
  await page.goto('/theses/new');
  await page.getByLabel('The thesis').fill(unsavedByA);
  await page.waitForFunction(
    ([key, text]) => localStorage.getItem(key)?.includes(text) ?? false,
    [AUTOSAVE_KEY, unsavedByA],
  );
  await page.goto('/theses/mine');
  await expect(page.getByText(savedByA)).toBeVisible(); // so A's drafts are in the query cache
  await signOut(page);

  await signInWithForm(page, b);

  await page.goto('/theses/mine');
  await expect(page.getByText('No drafts yet — start one below.')).toBeVisible();
  await expect(page.getByText(savedByA)).toHaveCount(0);

  await page.goto('/theses/new');
  // Once React updates the character count, the form has hydrated and
  // its once-only check for a draft to restore has already run.
  await page.getByLabel('The thesis').pressSequentially('B');
  await expect(page.getByText('1 characters. Minimum 80.')).toBeVisible();
  await expect(page.getByText('Found an unsaved draft from last time.')).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key) ?? '', AUTOSAVE_KEY)).not.toContain('Unsaved by A');
});

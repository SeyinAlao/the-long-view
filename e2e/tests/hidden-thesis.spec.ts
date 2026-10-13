import { test, expect } from '../support/fixtures';
import { addPrice, hideThesis } from '../support/db';
import { expectNoAxeViolations } from '../support/a11y';
import { newAccount, signUpWithApi } from '../support/accounts';
import { createThesis } from '../support/theses-api';

// The operator's takedown (Terms, section 7): the author is told, in
// neutral words and without the reason; nobody else can read the thesis.
test('a thesis the operator removed shows its author a neutral notice, and nobody else anything', async ({
  page,
  request,
}) => {
  await addPrice('MTNN', 250);
  await signUpWithApi(page, newAccount('removed_author'));
  const id = await createThesis(page.request, { ticker: 'MTNN', label: 'Removed', publish: true });
  await hideThesis(id, 'a_reason_nobody_may_see');

  await page.goto(`/theses/${id}`);
  await expect(page.getByRole('heading', { name: 'Thesis removed' })).toBeVisible();
  await expect(page.getByText(/^Removed by the operator on \d{1,2} \w{3} \d{4}\.$/)).toBeVisible();
  await expect(page.getByText('a_reason_nobody_may_see')).toHaveCount(0);
  await expect(page.locator('main[aria-busy="true"]')).toHaveCount(0);
  await expectNoAxeViolations(page, 'a removed thesis, as its author');

  // The author's own list shows the same notice, and no link to the text.
  await page.goto('/theses/mine');
  await page.getByRole('button', { name: 'Published (1)' }).click();
  await expect(page.getByText(/^Removed by the operator on /)).toBeVisible();

  // A visitor with no session: the API answers as for a thesis that does not exist.
  const stranger = await request.get(`/api/theses/${id}`);
  expect(stranger.status()).toBe(404);
  const list = await request.get('/api/theses');
  expect(await list.json()).toEqual([]);
});

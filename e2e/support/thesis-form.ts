import { expect, type Page } from '@playwright/test';

// Long enough for the 80-character minimum, and recognisable on the
// Ledger and in My research.
export function statementFor(label: string): string {
  return `${label}: margins recover as input costs ease, and the market has not priced the next two quarters of it in.`;
}

export async function chooseCompany(page: Page, ticker: string): Promise<void> {
  const search = page.getByRole('combobox', { name: 'Security' });
  await search.click();
  await search.fill(ticker);
  await page.getByRole('option', { name: new RegExp(`^${ticker} —`) }).click();
  await expect(search).toHaveValue(new RegExp(`^${ticker} —`));
}

export async function fillThesis(
  page: Page,
  { ticker, statement, targetPrice }: { ticker: string; statement: string; targetPrice: number },
): Promise<void> {
  await chooseCompany(page, ticker);
  await page.getByLabel('The thesis').fill(statement);
  await page.getByLabel('Target price').fill(String(targetPrice));
}

export async function saveDraft(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Save private draft' }).click();
  await expect(page.getByText('Saved as a private draft')).toBeVisible();
}

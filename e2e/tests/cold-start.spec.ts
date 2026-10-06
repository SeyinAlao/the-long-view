import { test, expect } from '../support/fixtures';
import { setRelay } from '../support/relay-control';
import { publishedThesis } from '../support/theses-api';

// Render's free API sleeps; the first visitor waits ~46s. The relay
// imitates that by holding every API request for 12s, server-side
// fetches and the browser's /api calls alike. A thesis page, because it
// renders on every request; the cached Ledger never waits for the API.
const DELAY_MS = 12_000;

test('a slow API shows a skeleton at once, a "Still loading" line after ~8s, then the real page', async ({
  page,
  request,
}) => {
  test.setTimeout(40_000);
  const id = await publishedThesis(request, 'Cold');
  await setRelay(request, `delayMs=${DELAY_MS}`);
  const started = Date.now();
  await page.goto(`/theses/${id}`, { waitUntil: 'commit' });

  const skeleton = page.locator('main[aria-busy="true"]');
  await expect(skeleton).toBeVisible({ timeout: 1_500 });

  // The header's account button is a same-size placeholder until the
  // session check answers.
  const placeholder = page.locator('header span[aria-hidden="true"]', { hasText: 'Publish a thesis' });
  await expect(placeholder).toBeVisible();
  const placeholderBox = await placeholder.boundingBox();

  // Hidden by CSS for the first 8 seconds, then fades in.
  const notice = page.getByText('Still loading — this can take up to a minute.');
  const opacity = () => notice.evaluate((el) => Number(getComputedStyle(el).opacity));
  expect(await opacity()).toBe(0);
  await page.waitForTimeout(Math.max(0, 7_000 - (Date.now() - started)));
  expect(await opacity(), 'still hidden at 7s').toBe(0);
  await expect.poll(opacity, { timeout: 3_000, message: 'visible by about 9s' }).toBe(1);
  expect(Date.now() - started).toBeLessThan(DELAY_MS); // seen while still waiting

  await expect(page.getByRole('heading', { name: 'MTN Nigeria Communications Plc' })).toBeVisible({ timeout: 20_000 });
  await expect(skeleton).toHaveCount(0);

  const button = page.locator('header').getByRole('link', { name: 'Publish a thesis' });
  await expect(button).toBeVisible({ timeout: 20_000 });
  const buttonBox = await button.boundingBox();
  expect(placeholderBox).not.toBeNull();
  expect({ width: placeholderBox!.width, height: placeholderBox!.height }).toEqual({
    width: buttonBox!.width,
    height: buttonBox!.height,
  });
});

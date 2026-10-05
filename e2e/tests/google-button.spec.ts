import { test, expect } from '../support/fixtures';

// The reset-on-Back code only matters when the browser restores the page
// from its back/forward cache. Playwright's Chromium turns that cache off
// by default; let it run here so the real case can happen, and record
// which case the run actually exercised.
test.use({ launchOptions: { ignoreDefaultArgs: ['--disable-back-forward-cache'] } });

test('the Google button shows "Connecting to Google…" on click and resets on Back', async ({ page }) => {
  // Hold the sign-in request open so the in-between state can be seen,
  // then answer it with a stub page: nothing reaches the API or Google.
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/api/auth/google', async (route) => {
    await released;
    await route.fulfill({ contentType: 'text/html', body: '<title>Not Google</title><p>Stub</p>' });
  });
  await page.addInitScript(() => {
    window.addEventListener('pageshow', (e) => {
      (window as unknown as { restoredFromCache?: boolean }).restoredFromCache = e.persisted;
    });
  });

  await page.goto('/login');

  // While a navigation is in flight - and this one is held open on
  // purpose - Playwright's locators and evaluate() wait for it to finish.
  // Console messages still arrive, so the page reports every change to
  // the button itself, as it happens.
  const states: string[] = [];
  page.on('console', (message) => {
    if (message.text().startsWith('google-button:')) states.push(message.text());
  });
  const button = page.getByRole('link', { name: 'Continue with Google' });
  await button.evaluate((link) => {
    const report = () =>
      console.log(`google-button: ${link.textContent?.trim()} | aria-busy=${link.getAttribute('aria-busy')}`);
    new MutationObserver(report).observe(link, { attributes: true, childList: true, subtree: true, characterData: true });
  });

  await button.click({ noWaitAfter: true });
  await expect.poll(() => states).toContain('google-button: Connecting to Google… | aria-busy=true');

  release();
  await expect(page).toHaveTitle('Not Google');
  await page.goBack();

  await expect(page.getByRole('link', { name: 'Continue with Google' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continue with Google' })).toHaveAttribute('aria-busy', 'false');

  const restored = await page.evaluate(() => (window as unknown as { restoredFromCache?: boolean }).restoredFromCache);
  test.info().annotations.push({
    type: 'back-forward cache',
    description: restored ? 'page was restored from the cache (pageshow reset exercised)' : 'page was reloaded, not restored',
  });
});

// The case the test above can't reach on its own: headless Chromium
// reloaded the page rather than restoring it from the back/forward
// cache, and Chrome masks the reason. So recreate a restored page
// directly: answer the sign-in request with 204 No Content (the browser
// keeps the current page, stuck on "Connecting…", exactly as the cache
// would hand it back), then fire the pageshow event a restore fires.
test('a page restored from the back/forward cache resets the stuck Google button', async ({ page }) => {
  await page.route('**/api/auth/google', (route) => route.fulfill({ status: 204 }));
  await page.goto('/login');
  await page.getByRole('link', { name: 'Continue with Google' }).click();

  const stuck = page.getByRole('link', { name: 'Connecting to Google…' });
  await expect(stuck).toHaveAttribute('aria-busy', 'true');

  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(page.getByRole('link', { name: 'Continue with Google' })).toHaveAttribute('aria-busy', 'false');
});

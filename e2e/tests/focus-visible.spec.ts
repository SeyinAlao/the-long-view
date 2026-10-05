import { test, expect } from '../support/fixtures';
import type { Page } from '@playwright/test';
import { newAccount, signUpWithApi } from '../support/accounts';
import { settleElement, settlePage } from '../support/settle';

interface Stop {
  element: string;
  outline: string;
  focusColour: string;
}

// Tabs through the whole page, from the top until focus leaves or wraps,
// and reads each stop's outline once its colour transition has settled
// (~150ms). Every stop must show the one global :focus-visible outline:
// solid, at least 2px, in the --color-focus token (globals.css, ADR 008).
async function tabStops(page: Page): Promise<Stop[]> {
  await settlePage(page);
  const stops: Stop[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < 80; i += 1) {
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    if ((await focused.count()) === 0) break; // focus left the page
    await settleElement(focused);
    const stop = await focused.evaluate((el) => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--color-focus)';
      document.body.append(probe);
      const focusColour = getComputedStyle(probe).color;
      probe.remove();
      const s = getComputedStyle(el);
      const label = (el.getAttribute('aria-label') || el.textContent || el.id || '').trim().slice(0, 40);
      return {
        element: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''} "${label}"`,
        outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`,
        focusColour,
      };
    });
    if (seen.has(stop.element)) break; // wrapped around
    seen.add(stop.element);
    stops.push(stop);
  }
  return stops;
}

function expectAllVisible(stops: Stop[]) {
  expect(stops.length).toBeGreaterThan(3);
  const missing = stops.filter((s) => {
    const [style, width] = s.outline.split(' ');
    return style !== 'solid' || parseFloat(width) < 2 || !s.outline.endsWith(s.focusColour);
  });
  expect(missing.map((s) => `${s.element}: ${s.outline} (expected 2px solid ${s.focusColour})`)).toEqual([]);
}

test('every Tab stop on sign-in shows a visible focus outline', async ({ page }) => {
  await page.goto('/login');
  expectAllVisible(await tabStops(page));
});

test('every Tab stop on write-a-thesis shows a visible focus outline', async ({ page }) => {
  await signUpWithApi(page, newAccount('keyboard'));
  await page.goto('/theses/new');
  await expect(page.getByLabel('The thesis')).toBeVisible();
  expectAllVisible(await tabStops(page));
});

import type { Locator, Page } from '@playwright/test';

// Lessons from running these checks by hand: the counter form fades in,
// and a contrast measurement taken mid-fade reports false failures; a
// focus outline animates its colour for ~150ms. So nothing is measured
// until motion has stopped.
//
// Two kinds of motion: CSS animations/transitions (visible through
// getAnimations()), and framer-motion's, which may run in JavaScript and
// write inline styles. The second is caught by waiting until no inline
// opacity/transform changes between two checks.

// Functions, never strings: Playwright runs a string through eval, which
// the site's Content Security Policy blocks (ADR 011).
export async function settlePage(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
      .every((a) => a.playState !== 'running'),
  );
  await page.waitForFunction(() => {
    const snapshot = () =>
      [...document.querySelectorAll<HTMLElement>('[style]')]
        .map((el) => `${el.style.opacity}|${el.style.transform}`)
        .join(',');
    const w = window as unknown as { __lastStyles?: string };
    const now = snapshot();
    const stable = w.__lastStyles === now;
    w.__lastStyles = now;
    return stable;
  }, undefined, { polling: 100 });
}

// Only this element's own transitions, e.g. a focus outline settling.
export async function settleElement(element: Locator): Promise<void> {
  await element.evaluate((el) =>
    Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined))),
  );
}

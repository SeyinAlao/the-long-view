import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { settlePage } from './settle';

// WCAG 2.0, 2.1 and 2.2, levels A and AA - the project's standard.
const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// Runs axe once motion has stopped and fails with a readable list:
// rule, impact, and the offending elements - not a wall of JSON.
export async function expectNoAxeViolations(page: Page, label: string): Promise<void> {
  await settlePage(page);
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
  const summary = violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).join('\n    ')}`,
  );
  expect(summary, `axe WCAG 2.2 AA violations on ${label}`).toEqual([]);
}

import { filterActions, openActions } from './campusNavigation';
import { expect, test } from '@playwright/test';

/**
 * ui-qa-fixes branch: Playwright coverage for the 4 QA findings that are genuinely about on-screen
 * behavior (visible text, a real button click) rather than pure logic already covered by
 * tests/ui/*.test.ts. Does not touch or weaken smoke.spec.ts's existing assertions.
 */

test('finding #1: the Regulation tab never shows a docketAmendment permit row', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tutorial' }).click();
  await openActions(page);
  await filterActions(page, 'Regulation');

  await expect(page.getByText('File air permit')).toBeVisible();
  await expect(page.getByText('File water permit')).toBeVisible();
  await expect(page.getByText('File wetlands permit')).toBeVisible();
  await expect(page.getByText('File building permit')).toBeVisible();
  await expect(page.getByText('File docketAmendment permit')).toHaveCount(0);
});

test('finding #3: selecting a hall on the map shows a filter banner, and "Show all" clears it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tutorial' }).click();

  await expect(page.getByText('Showing H1 only')).toHaveCount(0);
  await page.getByRole('button', { name: /H1/ }).first().click();
  await openActions(page);
  await expect(page.getByText('Showing H1 only')).toBeVisible();

  await page.getByRole('button', { name: 'Show all' }).click();
  await expect(page.getByText('Showing H1 only')).toHaveCount(0);
});

test('finding #2: a scripted event choice shows a cost preview before it is committed', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tutorial' }).click();

  // governor_visit is scripted to fire at month index 3 (content/events.json). step.ts's drawEvent
  // runs on the CURRENT month before it increments, so the 4th "End month" click is the one whose
  // step() call sees month index 3 and draws the card (the first 3 clicks only advance month 0->3).
  const dialog = page.getByRole('dialog');
  for (let i = 0; i < 4 && (await dialog.count()) === 0; i += 1) {
    await page.getByRole('button', { name: 'End month' }).click();
  }
  await expect(dialog).toBeVisible();

  const hostChoice = page.getByTestId('event-choice').filter({ hasText: 'Host the visit' });
  await expect(hostChoice).toContainText("Uses 1 of next month's actions");
  // UX 9: the bespoke stakes name the rebate, not a generic fallback.
  await expect(hostChoice).toContainText('$20.0M equipment rebate');
  await expect(page.getByTestId('event-choice').filter({ hasText: 'Decline' })).toContainText('No visit, no rebate');
});

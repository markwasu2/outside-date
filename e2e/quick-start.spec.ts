import { openStatus } from './campusNavigation';
import { expect, test } from '@playwright/test';

// UX queue item 3 (cold playthrough): six setup screens with no quick way in. The title
// screen's Quick start skips the whole wizard with the recommended setup (the wizard's own
// defaults) and lands the player on the board.
test('quick start skips all six setup screens and lands on the board', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {localStorage.clear();localStorage.setItem('outside-date-detailed','true');});
  await page.goto('/');
  await page.locator('select').first().selectOption('whale');

  await page.getByTestId('quick-start').click();

  // Board, not a wizard screen: the goal strip and HUD are up, and no "Next:" wizard button exists.
  await openStatus(page);
  await expect(page.getByTestId('goal-strip')).toBeVisible();
  await expect(page.getByRole('button', { name: 'End month' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next: Hall tier', exact: true })).toHaveCount(0);

  // The campaign really started with the recommended setup: month 1 of the whale scenario.
  await openStatus(page);
  await expect(page.getByTestId('goal-strip')).toContainText('Goal: deliver all 4 halls');
});

// UX 11: the scoring rules surface early, tied to the goal line - the goal strip's toggle opens
// a panel with the four live score components and the win tiers.
test('goal strip surfaces the scoring rules on demand', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {localStorage.clear();localStorage.setItem('outside-date-detailed','true');});
  await page.goto('/');
  await page.locator('select').first().selectOption('whale');
  await page.getByTestId('quick-start').click();

  await expect(page.getByTestId('score-rules-panel')).toHaveCount(0);
  await openStatus(page);
  await page.getByTestId('score-rules-toggle').click();
  const panel = page.getByTestId('score-rules-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Power');
  await expect(panel).toContainText('Tenant');
  await expect(panel).toContainText('Coverage');
  await expect(panel).toContainText('Asset');
  await expect(panel).toContainText('Great: 2.0x equity');
  await openStatus(page);
  await page.getByTestId('score-rules-toggle').click();
  await expect(page.getByTestId('score-rules-panel')).toHaveCount(0);
});

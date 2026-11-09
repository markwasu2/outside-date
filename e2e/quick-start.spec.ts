import { expect, test } from '@playwright/test';

// UX queue item 3 (cold playthrough): six setup screens with no quick way in. The title
// screen's Quick start skips the whole wizard with the recommended setup (the wizard's own
// defaults) and lands the player on the board.
test('quick start skips all six setup screens and lands on the board', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await page.locator('select').first().selectOption('whale');

  await page.getByTestId('quick-start').click();

  // Board, not a wizard screen: the goal strip and HUD are up, and no "Next:" wizard button exists.
  await expect(page.getByTestId('goal-strip')).toBeVisible();
  await expect(page.getByRole('button', { name: 'End month' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Next: / })).toHaveCount(0);

  // The campaign really started with the recommended setup: month 1 of the whale scenario.
  await expect(page.getByTestId('goal-strip')).toContainText('Goal: deliver all 4 halls');
});

import { expect, test } from '@playwright/test';

/** Phase 9 (riverbend-farm retune) evidence screenshot - the site card tells the new story. */

test('phase 9 riverbend site card shot', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.locator('select').first().selectOption('millbrook-relay');
  await page.getByRole('button', { name: 'New game' }).click();
  const card = page.getByTestId('site-card-riverbend-farm');
  await expect(card).toBeVisible();
  await expect(card).toContainText('wetlands sign-off already recorded');
  await expect(card).toContainText('Easement already recorded: the wetlands permit comes cured at close');
  // The cured permit no longer shows up as something to chase.
  await expect(card).not.toContainText('needs wetlands');
  await expect(card).toContainText('+3 pad months');
  await expect(page.getByTestId('site-card-rail-yard')).toBeVisible();
  await expect(page.getByTestId('site-card-depot-flats')).toBeVisible();
  await page.screenshot({ path: '/downloads/p9-riverbend-card.png' });
});

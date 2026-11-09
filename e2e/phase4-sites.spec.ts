import { expect, test, type Page } from '@playwright/test';

/** Phase 4 (pillar A): the setup step offers three site cards per scenario, picking one
 * re-themes the card's map preview and the in-game map, and the forecast estimate moves
 * with the site's land cost. */

async function openSetup(page: Page, scenarioId: string) {
  await page.goto('/');
  await page.locator('select').first().selectOption(scenarioId);
  await page.getByRole('button', { name: 'New game' }).click();
}

async function forecastEstimate(page: Page, siteId: string) {
  await openSetup(page, 'whale');
  await page.getByTestId(`site-card-${siteId}`).click();
  await page.getByRole('button', { name: 'Next: Lease' }).click();
  await page.getByRole('button', { name: 'Next: Forecast' }).click();
  const text = await page.getByText(/Our estimate is /).textContent();
  return text ?? '';
}

test('whale setup step shows three site cards with map previews', async ({ page }) => {
  await openSetup(page, 'whale');
  await expect(page.getByTestId('site-card-megasite')).toBeVisible();
  await expect(page.getByTestId('site-card-farmland')).toBeVisible();
  await expect(page.getByTestId('site-card-quarry-ridge')).toBeVisible();
  await expect(page.getByTestId('site-preview-road')).toHaveCount(3);
});

test('each site pick re-themes its map preview (pond, ground, poles)', async ({ page }) => {
  await openSetup(page, 'whale');
  const farmland = page.getByTestId('site-card-farmland');
  await expect(farmland.getByTestId('site-preview-pond')).toHaveAttribute('data-pond', 'true');
  const megasite = page.getByTestId('site-card-megasite');
  await expect(megasite.getByTestId('site-preview-pond')).toHaveAttribute('data-pond', 'false');
  // Quarry ridge is the pole-line site: its preview road carries poles, the megasite's none.
  await expect(page.getByTestId('site-card-quarry-ridge').getByTestId('site-preview-road')).toContainText('🗼');
  await expect(megasite.getByTestId('site-preview-road')).not.toContainText('🗼');
});

test('the forecast estimate moves with the picked site', async ({ page }) => {
  const mega = await forecastEstimate(page, 'megasite');
  const farm = await forecastEstimate(page, 'farmland');
  const quarry = await forecastEstimate(page, 'quarry-ridge');
  expect(mega).not.toBe(farm);
  expect(farm).not.toBe(quarry);
  expect(mega).not.toBe(quarry);
});

test('the in-game map reads the picked site theme', async ({ page }) => {
  await openSetup(page, 'whale');
  await page.getByTestId('site-card-farmland').click();
  await page.getByRole('button', { name: 'Next: Lease' }).click();
  await page.getByRole('button', { name: 'Next: Forecast' }).click();
  await page.getByRole('button', { name: 'Next: Capital stack' }).click();
  await page.getByRole('button', { name: 'Next: Power' }).click();
  await page.getByRole('button', { name: 'Next: Insurance' }).click();
  await page.getByRole('button', { name: 'Start campaign' }).click();
  await expect(page.getByTestId('map-root')).toBeVisible();
  await expect(page.getByTestId('map-pond-slot')).toHaveAttribute('data-pond', 'true');
  const ground = await page.getByTestId('map-root').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(ground).not.toBe('rgb(215, 204, 200)'); // not the megasite ground
});

import { expect, test } from '@playwright/test';

test('illustrated access road keeps its label and transmission clues visible', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('quick-start').click();
  const road = page.getByTestId('map-road');
  await expect(road.locator('img')).toBeVisible();
  await expect(road).toContainText('Road');
  await page.screenshot({ path: 'docs/screenshots/cold2/art-road.png' });
});

test('dry sites show dry illustrated land while retaining the labelled water route', async ({ page }) => {
  await page.goto('/'); await page.getByTestId('quick-start').click();
  const field = page.getByTestId('map-pond-slot');
  await expect(field).toHaveAttribute('data-pond', 'false');
  await expect(field.locator('img')).toBeVisible();
  await expect(field).toContainText('Water permit');
  await page.screenshot({ path: 'docs/screenshots/cold2/art-dry-field.png' });
});

test('setup site previews use the same illustrated board assets and keep theme clues', async ({ page }) => {
  await page.goto('/'); await page.locator('select').first().selectOption('whale');
  await page.getByRole('button', { name: 'New game' }).click();
  await expect(page.getByTestId('site-art-preview')).toHaveCount(3);
  await expect(page.getByTestId('site-card-megasite').locator('img')).toHaveCount(4);
  await expect(page.getByTestId('site-card-farmland').getByTestId('site-preview-pond')).toHaveAttribute('data-pond','true');
  await page.screenshot({ path: 'docs/screenshots/cold2/art-setup.png', fullPage: true });
});

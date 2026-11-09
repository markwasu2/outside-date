import { expect, test } from '@playwright/test';

test('illustrated access road keeps its label and transmission clues visible', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('quick-start').click();
  const road = page.getByTestId('map-road');
  await expect(road.locator('img')).toBeVisible();
  await expect(road).toContainText('Road');
  await page.screenshot({ path: 'docs/screenshots/cold2/art-road.png' });
});

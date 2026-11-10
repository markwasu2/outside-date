import { expect, test } from '@playwright/test';
import { openActions, openStatus, closePanel } from './campusNavigation';

test('desktop opens on one campus canvas with details on demand and End month persistent', async ({ page }) => {
  await page.goto('/'); await page.getByTestId('quick-start').click();
  await expect(page.getByTestId('actions-drawer')).toHaveCount(0);
  await expect(page.getByTestId('status-drawer')).toHaveCount(0);
  const map = await page.getByTestId('map-root').boundingBox();
  expect(map!.width).toBeGreaterThan(1200); expect(map!.height).toBeGreaterThan(500);
  await page.screenshot({ path: 'docs/screenshots/cold2/campus-1280.png' });
  await page.setViewportSize({width:1440,height:900});
  await page.screenshot({ path: 'docs/screenshots/cold2/campus-1440.png' });
  await page.getByRole('button', { name: 'Show me', exact: true }).click();
  await expect(page.getByTestId('map-popover')).toBeVisible();
  await expect(page.getByTestId('popover-action').filter({hasText:'Commission the interconnection study'})).toBeVisible();
  await page.keyboard.press('Escape');
  await openActions(page); await expect(page.getByRole('button', {name:'Capital',exact:true})).toBeVisible();
  await closePanel(page); await openStatus(page); await expect(page.getByTestId('goal-strip')).toBeVisible();
  await closePanel(page); await page.getByRole('button',{name:'End month',exact:true}).click();
  await expect(page.getByTestId('campus-status')).toContainText('Y1 M2');
});

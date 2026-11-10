import { expect, test } from '@playwright/test';
import { filterActions, openStatus, closePanel } from './campusNavigation';

test('desktop opens on one campus canvas with details on demand and End month persistent', async ({ page }) => {
  await page.goto('/'); await page.getByTestId('quick-start').click();
  await expect(page.getByTestId('actions-drawer')).toHaveCount(0);
  await expect(page.getByTestId('status-drawer')).toHaveCount(0);
  const map = await page.getByTestId('map-root').boundingBox();
  expect(map!.width).toBeGreaterThan(1200); expect(map!.height).toBeGreaterThan(500);
  await page.screenshot({ path: 'docs/screenshots/cold2/scene-1280.png' });
  await page.setViewportSize({width:1440,height:900});
  await page.screenshot({ path: 'docs/screenshots/cold2/scene-1440.png' });
  await page.getByRole('button', { name: 'Show me', exact: true }).click();
  await expect(page.getByTestId('map-popover')).toBeVisible();
  await expect(page.getByTestId('popover-action').filter({hasText:'Commission the interconnection study'})).toBeVisible();
  await page.keyboard.press('Escape');
  await filterActions(page, 'capital'); await expect(page.getByTestId('action-search')).toBeVisible();
  await expect(page.getByTestId('action-row-button').first()).toBeVisible();
  await closePanel(page); await openStatus(page); await expect(page.getByTestId('goal-strip')).toBeVisible();
  await closePanel(page); await page.getByRole('button',{name:'End month',exact:true}).click();
  // A month-0 random event can pause the commit; answer it before checking advancement.
  while (await page.getByTestId('event-choice').count()) await page.getByTestId('event-choice').first().click();
  await expect(page.getByTestId('campus-status')).toContainText('Y1 M2');
});

test('land, finance, crews and chips are reachable directly from campus objects', async ({ page }) => {
  await page.goto('/'); await page.getByTestId('quick-start').click();
  await page.getByTestId('map-road').click();
  await expect(page.getByTestId('popover-action').filter({hasText:'Option the site'})).toBeVisible();
  await page.getByTestId('map-popover').getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:/Site office/}).click();
  await expect(page.getByTestId('popover-action').filter({hasText:'Confirm the rack schedule'})).toBeVisible();
  await page.getByRole('button',{name:'Insurance & lender',exact:true}).click();
  await expect(page.getByTestId('popover-action').filter({hasText:'Cure'})).toBeVisible();
  await page.getByRole('button',{name:'Raise capital',exact:true}).click();
  await expect(page.getByTestId('popover-action').filter({hasText:/sponsor bridge/i})).toBeVisible();
  await page.screenshot({path:'docs/screenshots/cold2/campus-finance.png'});
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:/Laydown yard/}).click();
  await expect(page.getByTestId('popover-action').filter({hasText:/Import/})).toBeVisible();
  await page.keyboard.press('Escape'); await page.getByTestId('campus-people').click();
  await expect(page.getByTestId('popover-action').filter({hasText:'Visit utility'})).toBeVisible();
  await page.screenshot({path:'docs/screenshots/cold2/scene-people.png'});
  await page.keyboard.press('Escape'); await page.getByRole('button',{name:'Power plants',exact:true}).click();
  await expect(page.getByTestId('map-popover')).toContainText('waiting for the power docket');
});

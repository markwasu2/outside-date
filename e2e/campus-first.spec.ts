import { expect, test } from '@playwright/test';
import { filterActions, openStatus, closePanel } from './campusNavigation';

test('desktop opens on one campus canvas with details on demand and End month persistent', async ({ page }) => {
  await page.goto('/'); await page.getByTestId('quick-start').click();

  await expect(page.getByTestId('monthly-decisions-help')).toHaveCount(0);await expect(page.getByTestId('action-desk')).toHaveCount(0);
  await expect(page.getByTestId('actions-drawer')).toHaveCount(0);
  await expect(page.getByTestId('status-drawer')).toHaveCount(0);
  const map = await page.getByTestId('map-root').boundingBox();
  expect(map!.width).toBeGreaterThan(850); expect(map!.height).toBeGreaterThan(500);
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
  // A month-0 random event can pause the commit; answer it before checking advancement. Resolved
  // via the store's first (old-style) choice id, whether the card renders buttons or a scale.
  await page.evaluate(async () => {
    // @ts-expect-error dev browser import
    const {useStore} = await import('/src/ui/store.ts');
    const s = useStore.getState(); while (s.state.pending) s.resolveEventChoice(s.state.pending.choices[0].id);
  });
  await expect(page.getByTestId('campus-status')).toContainText('Y1 M2');
});

test('land, finance, crews and chips are reachable directly from campus objects', async ({ page }) => {
  await page.goto('/'); await page.getByTestId('quick-start').click();
  await page.getByTestId('map-road').click();
  await expect(page.getByTestId('popover-action').filter({hasText:'Option the site'})).toContainText('$50.0M total, from $50.0M equity');
  await page.screenshot({path:'docs/screenshots/cold2/site-cost-truth.png'});
  await page.getByTestId('map-popover').getByRole('button',{name:'Close',exact:true}).click();
  await page.getByTestId('map-root').getByRole('button',{name:/Site office/}).click();
  await expect(page.getByTestId('popover-action').filter({hasText:'Confirm the rack schedule'})).toBeVisible();
  await page.getByRole('button',{name:'Insurance & lender',exact:true}).click();
  await expect(page.getByTestId('popover-action').filter({hasText:'Cure'})).not.toBeVisible();
  await page.getByTestId('context-only-actions').locator('summary').click();
  await expect(page.getByTestId('popover-action').filter({hasText:'Cure'})).toBeVisible();
  await page.getByRole('button',{name:'Raise capital',exact:true}).click();
  await expect(page.getByTestId('popover-action').filter({hasText:/sponsor bridge/i})).toBeVisible();
  await page.screenshot({path:'docs/screenshots/cold2/campus-finance.png'});
  await page.keyboard.press('Escape');
  await page.getByTestId('map-root').getByRole('button',{name:/Laydown yard/}).click();
  await expect(page.getByTestId('popover-action').filter({hasText:/Import/})).toBeVisible();
  await page.keyboard.press('Escape'); await page.getByTestId('campus-people').click();
  await expect(page.getByTestId('popover-action').filter({hasText:'Visit utility'})).toBeVisible();
  await page.screenshot({path:'docs/screenshots/cold2/scene-people.png'});
  await page.keyboard.press('Escape'); await page.getByRole('button',{name:'Power plants',exact:true}).click();
  await expect(page.getByTestId('map-popover')).toContainText('waiting for the power docket');
});

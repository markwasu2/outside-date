import { openStatus, closePanel } from './campusNavigation';
import { expect, test, type Page } from '@playwright/test';

/**
 * Phase 1 "The Living Board": end-to-end coverage of the new board layer (D1-D9) against the
 * real Vite dev server. Test 1 drives the tutorial by real clicks: map popovers, queueing from
 * the popover, the queued ghost, and the laydown yard's order display. Test 2 starts a Whale
 * campaign through the real setup wizard and checks the generic 4-hall layout. Test 3
 * fast-forwards the tutorial (same queue-everything strategy as e2e/smoke.spec.ts) until the
 * first hall delivers, proving the delivered-hall rent ticker (D4) renders on real state.
 */

/** Dismisses a scripted event dialog if one is up; returns whether one was. */
async function dismissEventIfUp(page: Page) {
  const dialog = page.getByRole('dialog');
  if ((await dialog.count()) > 0) {
    await page.getByTestId('event-choice').first().click();
    return true;
  }
  return false;
}

test('tutorial: substation popover queues the study from the map, and the month advances it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tutorial' }).click();

  // D7/D8: the progress spine and its Next step card are up from month 0; no warnings on a fresh
  // healthy state.
  await openStatus(page);
  await expect(page.getByTestId('progress-spine')).toBeVisible();
  await expect(page.getByTestId('next-step-card')).toContainText('interconnection study');
  await openStatus(page);
  await expect(page.getByTestId('warning-banner')).toHaveCount(0);

  await closePanel(page);
  // D1/D6: clicking the substation opens its popover with the first-open teaching line.
  const substation = page.getByTestId('map-root').getByRole('button', { name: /Substation/ });
  await substation.click();
  const popover = page.getByTestId('map-popover');
  await expect(popover).toBeVisible();
  await expect(page.getByTestId('popover-teaching')).toBeVisible();

  // D1: the popover lists the same study action the Power track offers - queue it from the map.
  await popover.getByTestId('popover-action').filter({ hasText: 'Commission the interconnection study' }).click();
  await expect(popover).toBeVisible();
  await expect(popover.getByRole('status')).toContainText('planned.');
  await expect(page.getByTestId('next-step-card')).not.toContainText('Commission the interconnection study');
  await expect(page.getByTestId('queued-ghost').first()).toBeVisible();

  // End month: the plan clears and the study is visibly underway on the board.
  await page.getByRole('button', { name: 'End month' }).click();
  await dismissEventIfUp(page);
  await expect(page.getByTestId('queued-ghost')).toHaveCount(0);
  await expect(substation).toContainText('study');

  // D9: ordering the switchgear puts a dated crate in the laydown yard.
  await substation.click();
  await page
    .getByTestId('map-popover')
    .getByTestId('popover-action')
    .filter({ hasText: 'Order the switchgear' })
    .click();
  await expect(page.getByTestId('map-root').getByRole('button', { name: /Laydown yard/ })).toContainText('switchgear');
});

test('Whale month 0 shows four hall sprites on the board', async ({ page }) => {
  await page.goto('/');
  await page.locator('select').first().selectOption('whale');
  await page.getByRole('button', { name: 'New game' }).click();
  for (const name of ['Next: Hall tier','Next: Cooling','Next: Contractor']) await page.getByRole('button',{name,exact:true}).click();
  await page.getByRole('button', { name: 'Next: Lease' }).click();
  await page.getByRole('button', { name: 'Next: Forecast' }).click();
  await page.getByRole('button', { name: 'Next: Capital stack' }).click();
  await page.getByRole('button', { name: 'Next: Power' }).click();
  await page.getByRole('button', { name: 'Next: Insurance' }).click();
  await page.getByRole('button',{name:'Review closing table',exact:true}).click();
  await page.getByRole('button', { name: 'Start campaign' }).click();

  // D5: the generic hall area lays out all 4 whale halls, no hardcoded pair.
  for (const id of ['H1', 'H2', 'H3', 'H4']) {
    await expect(page.locator(`[role="button"][title^="${id}: "]`)).toBeVisible();
  }
  // D7: the spine is up for a fresh Whale run too, pointing at the study first.
  await expect(page.getByTestId('next-step-card')).toContainText('interconnection study');
});

test('Whale: a delivered hall shows its rent ticker on the board', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __debugBotToFirstDelivery?: unknown }).__debugBotToFirstDelivery === 'function',
  );

  // The tutorial ends the moment its only hall delivers, so a delivered-hall board can never be
  // seen there. Drive the competent bot on Whale (4 halls, the run continues after the first
  // delivery) until the first hall delivers, then land that still-playing state in the UI - the
  // same pattern as smoke.spec.ts's __debugRunBot, via store.ts's dev-only
  // __debugBotToFirstDelivery hook.
  await page.evaluate(() => {
    (
      window as unknown as {
        __debugBotToFirstDelivery: (botId: string, scenarioId: string, difficulty: string, seed: number) => void;
      }
    // Phase 10: seed 2 plays farmland and now loses before any delivery (the pond blocks H1
    // there); seed 3 delivers at month 30.
    ).__debugBotToFirstDelivery('competent', 'whale', 'normal', 3);
  });

  // D4: the delivered hall carries a live rent ticker.
  await expect(page.getByTestId('rent-ticker').first()).toBeVisible();
  await expect(page.locator('[role="button"][title="H1: Delivered"]')).toBeVisible();
});

test('water permit has a labelled route from the site office and dry field', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('quick-start').click();
  await expect(page.getByTestId('map-pond-slot')).toContainText('Water permit');
  await page.getByTestId('map-root').getByRole('button', { name: /Site office/ }).click();
  const popover = page.getByTestId('map-popover');
  await expect(popover.getByTestId('popover-action').filter({ hasText: 'File water permit' })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/cold2/water-route.png' });
  await popover.getByTestId('popover-action').filter({ hasText: 'File water permit' }).click();
  await expect(page.getByTestId('queued-ghost').first()).toBeVisible();
});

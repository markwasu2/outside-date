import { openStatus, closePanel } from './campusNavigation';
import { expect, test, type Page } from '@playwright/test';

/**
 * Phase 5 "Living Markets": the HUD market strip, the substation order dialog's supplier
 * options, and supplier-tagged laydown crates, driven against the real dev server through the
 * tutorial (its first months exercise the same Power flow as a campaign).
 */

async function dismissEventIfUp(page: Page) {
  const dialog = page.getByRole('dialog');
  if ((await dialog.count()) > 0) {
    await page.getByTestId('event-choice').first().click();
    return true;
  }
  return false;
}

test('markets: HUD strip, order dialog supplier options, and a supplier-tagged crate', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tutorial' }).click();

  // The market strip reads 1.00x across the board on a fresh game.
  await openStatus(page);
  const strip = page.getByTestId('hud-markets');
  await expect(strip).toBeVisible();
  await expect(strip).toContainText('E 1.00x');
  await expect(strip).toContainText('L 1.00x');
  await expect(strip).toContainText('C 1.00x');

  await closePanel(page);
  // Commission the study and advance one month, the same flow living-board.spec.ts proves
  // unlocks the switchgear order in the tutorial.
  const substation = page.getByRole('button', { name: /Substation/ });
  await substation.click();
  await page
    .getByTestId('map-popover')
    .getByTestId('popover-action')
    .filter({ hasText: 'Commission the interconnection study' })
    .click();
  await page.getByRole('button', { name: 'End month' }).click();
  await dismissEventIfUp(page);
  await substation.click();

  // The order dialog offers the standard slot and a spot unit side by side.
  const popover = page.getByTestId('map-popover');
  const standard = popover.getByTestId('popover-action').filter({ hasText: 'Order the switchgear' });
  await expect(standard).toBeVisible();
  await expect(popover.getByTestId('popover-action').filter({ hasText: 'Spot-buy the switchgear' })).toBeVisible();

  // Book the standard slot: a supplier-tagged crate lands in the laydown yard. Popover actions
  // queue into the month plan, so end the month to place the order, then the dialog offers a
  // second supplier for the same unit.
  await standard.click();
  await expect(page.getByTestId('crate-switchgear-standard')).toBeVisible();
  await page.getByRole('button', { name: 'End month' }).click();
  await dismissEventIfUp(page);
  await substation.click();
  await expect(
    page.getByTestId('map-popover').getByTestId('popover-action').filter({ hasText: 'Second supplier for the switchgear' }),
  ).toBeVisible();
});

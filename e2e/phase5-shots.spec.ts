import { test, type Page } from '@playwright/test';

/** Phase 5 evidence screenshots - written to /downloads for inspection and the report. */

async function dismissEventIfUp(page: Page) {
  const dialog = page.getByRole('dialog');
  if ((await dialog.count()) > 0) {
    await page.getByTestId('event-choice').first().click();
    return true;
  }
  return false;
}

async function dismissExplainers(page: Page) {
  for (let i = 0; i < 15; i += 1) {
    const clicked = await page.evaluate(() => {
      const button = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Got it');
      button?.click();
      return Boolean(button);
    });
    if (!clicked) break;
    await page.waitForTimeout(120);
  }
}

test('phase 5 shots', async ({ page }) => {
  // Tutorial, 1440px: market strip in the HUD, substation order dialog with supplier
  // options, and the supplier-tagged crate in the laydown yard.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Tutorial' }).click();
  await dismissExplainers(page);
  await page.screenshot({ path: '/downloads/p5-map-strip-1440.png' });

  const substation = page.getByRole('button', { name: /Substation/ });
  await substation.click();
  await page
    .getByTestId('map-popover')
    .getByTestId('popover-action')
    .filter({ hasText: 'Commission the interconnection study' })
    .click();
  // Advance until the study completes and the order rows appear (up to 5 months). New stat
  // explainers auto-open as months advance and their outside-tap layer eats map clicks, so
  // dismiss them every month before touching the map.
  for (let i = 0; i < 5; i += 1) {
    await page.getByRole('button', { name: 'End month' }).click();
    await dismissEventIfUp(page);
    await dismissExplainers(page);
    await substation.click();
    if ((await page.getByTestId('map-popover').getByTestId('popover-action').filter({ hasText: 'Order the switchgear' }).count()) > 0) break;
  }
  await page.getByTestId('map-popover').getByTestId('popover-action').filter({ hasText: 'Order the switchgear' }).waitFor();
  await page.screenshot({ path: '/downloads/p5-order-dialog.png' });
  await page
    .getByTestId('map-popover')
    .getByTestId('popover-action')
    .filter({ hasText: 'Order the switchgear' })
    .click();
  await page.screenshot({ path: '/downloads/p5-crate-1440.png' });

  // The same board at 800px.
  await page.setViewportSize({ width: 800, height: 1000 });
  await page.screenshot({ path: '/downloads/p5-crate-800.png' });
});

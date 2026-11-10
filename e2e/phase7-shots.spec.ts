import { expect, test, type Page } from '@playwright/test';

/** Phase 7 scarcity pack evidence screenshots - written to /downloads for the report. */

async function startCampaign(page: Page, siteId: string) {
  await page.goto('/');
  await page.locator('select').first().selectOption('whale');
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByTestId(`site-card-${siteId}`).click();
  for (const n of ['Next: Hall tier', 'Next: Cooling', 'Next: Contractor', 'Next: Lease', 'Next: Forecast', 'Next: Capital stack', 'Next: Power', 'Next: Insurance']) {
    await page.getByRole('button', { name: n }).click();
  }
  await page.getByRole('button',{name:'Review closing table',exact:true}).click();
  await page.getByRole('button', { name: 'Start campaign' }).click();
  await page.getByTestId('map-root').waitFor();
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

test('phase 7 farmland pad choice shot', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  // Farmland: both near pads are back (Phase 8 moved the pond's cost to a hall position);
  // the far row owns up to the extra pad months. H2: H1 sits on the pond (Phase 10).
  await startCampaign(page, 'farmland');
  await page.getByText('H2', { exact: true }).click();
  const popover = page.getByTestId('map-popover');
  await expect(popover.getByTestId('popover-action').filter({ hasText: 'near pad' })).toContainText('2 of 2 left');
  await expect(popover.getByTestId('popover-action').filter({ hasText: 'far pad' })).toContainText('+2mo pad');
  await page.screenshot({ path: '/downloads/p7-farmland-pads.png' });
});

test('phase 7 laydown yard capacity shot', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  // Megasite: the laydown yard shows its crate capacity, mid-game with orders on the board.
  await startCampaign(page, 'megasite');
  await expect(page.getByTestId('yard-capacity')).toContainText('0/3');
  await page.waitForFunction(
    () => typeof (window as unknown as { __debugBotToFirstDelivery?: unknown }).__debugBotToFirstDelivery === 'function',
  );
  await page.evaluate(() =>
    (window as unknown as { __debugBotToFirstDelivery: (b: string, s: string, d: string, seed: number) => void }).__debugBotToFirstDelivery(
      'competent',
      'whale',
      // Seed 3: delivers (month 30) with crates still pending in the yard; seed 2 now loses
      // before any delivery - the pack's teeth.
      'normal',
      3,
    ),
  );
  await page.getByTestId('map-root').waitFor();
  await expect(page.getByTestId('yard-capacity')).toBeVisible();
  await page.screenshot({ path: '/downloads/p7-yard-capacity.png' });
});

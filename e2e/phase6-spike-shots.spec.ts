import { expect, test, type Page } from '@playwright/test';

/** Phase 6 spatial spike evidence screenshots - written to /downloads for the report. */

async function startCampaign(page: Page) {
  await page.goto('/');
  await page.locator('select').first().selectOption('whale');
  await page.getByRole('button', { name: 'New game' }).click();
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

test('phase 6 spike shots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await startCampaign(page);

  // Month 0: every hall is unplaced, and H1's popover offers the two pads.
  await expect(page.getByTestId('pad-H1')).toContainText('Choose pad');
  await page.screenshot({ path: '/downloads/p6-unplaced-1440.png' });
  await page.getByText('H1', { exact: true }).click();
  await expect(page.getByTestId('map-popover').getByTestId('popover-action').filter({ hasText: 'near pad' })).toBeVisible();
  await expect(page.getByTestId('map-popover').getByTestId('popover-action').filter({ hasText: 'far pad' })).toBeVisible();
  await page.screenshot({ path: '/downloads/p6-pad-choice.png' });

  // Mid-game via the bot hook: pads are chosen, near and far chips on the board.
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () => typeof (window as unknown as { __debugBotToFirstDelivery?: unknown }).__debugBotToFirstDelivery === 'function',
  );
  await page.evaluate(() =>
    (window as unknown as { __debugBotToFirstDelivery: (b: string, s: string, d: string, seed: number) => void }).__debugBotToFirstDelivery(
      'competent',
      'whale',
      'normal',
      // Phase 7: seed 2 now loses before any delivery (the pack's teeth); seed 3 delivers.
      3,
    ),
  );
  await page.getByTestId('map-root').waitFor();
  await expect(page.getByTestId('pad-H1')).toContainText('pad');
  await page.screenshot({ path: '/downloads/p6-pads-midgame-1440.png' });
  await page.setViewportSize({ width: 800, height: 1000 });
  await page.screenshot({ path: '/downloads/p6-pads-midgame-800.png' });
});

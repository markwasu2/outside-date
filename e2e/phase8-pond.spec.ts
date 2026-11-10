import { expect, test, type Page } from '@playwright/test';

/** Phase 8 (the pond takes a hall) evidence screenshot - written to /downloads for the report. */

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

test('phase 8 pond shot', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await startCampaign(page, 'farmland');

  // The pond took H1's position: the chip says so, and the popover offers the route through.
  await expect(page.getByTestId('pad-H1')).toContainText('pond');
  await page.getByText('H1', { exact: true }).click();
  const popover = page.getByTestId('map-popover');
  const route = popover.getByTestId('popover-action').filter({ hasText: 'Mitigate the wetlands pond' });
  await expect(route).toBeVisible();
  await expect(route).toContainText('$6.0M');
  await expect(route).toContainText('4mo');
  await page.screenshot({ path: '/downloads/p8-pond-blocked.png' });
});

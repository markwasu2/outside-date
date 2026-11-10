import { expect, test, type Page } from '@playwright/test';

/** Phase 4 evidence screenshots - written to /downloads for inspection and the report. */

async function openSetup(page: Page) {
  await page.goto('/');
  await page.locator('select').first().selectOption('whale');
  await page.getByRole('button', { name: 'New game' }).click();
}

async function startCampaign(page: Page, siteId: string) {
  await openSetup(page);
  await page.getByTestId(`site-card-${siteId}`).click();
  for (const n of ['Next: Hall tier', 'Next: Cooling', 'Next: Contractor', 'Next: Lease', 'Next: Forecast', 'Next: Capital stack', 'Next: Power', 'Next: Insurance']) {
    await page.getByRole('button', { name: n }).click();
  }
  await page.getByRole('button', { name: 'Start campaign' }).click();
  await page.getByTestId('map-root').waitFor();
  // Dismiss the month-1 stat explainers so the map reads clean in the evidence shot. They
  // auto-open one at a time as each is marked seen (Hud passes autoOpen to the first unseen),
  // so loop until none remain; force the click because the popover's own outside-tap layer
  // intercepts the pointer.
  for (let i = 0; i < 15; i += 1) {
    // DOM click, not a pointer click: the popover's outside-tap layer intercepts pointer
    // events, and a forced pointer click falls through to the map and opens an object popover.
    const clicked = await page.evaluate(() => {
      const button = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Got it');
      button?.click();
      return Boolean(button);
    });
    if (!clicked) break;
    await page.waitForTimeout(120); // let the seen-flag settle before the next one auto-opens
  }
  await expect(page.getByRole('button', { name: 'Got it' })).toHaveCount(0);
}

test('shots', async ({ page }) => {
  // Site cards at 800px and 1440px.
  await page.setViewportSize({ width: 800, height: 1000 });
  await openSetup(page);
  await page.screenshot({ path: '/downloads/p4-site-cards-800.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: '/downloads/p4-site-cards-1440.png', fullPage: true });

  // Forecast reflecting a non-default site (farmland).
  await page.getByTestId('site-card-farmland').click();
  for (const name of ['Next: Hall tier','Next: Cooling','Next: Contractor']) await page.getByRole('button',{name,exact:true}).click();
  await page.getByRole('button', { name: 'Next: Lease' }).click();
  await page.getByRole('button', { name: 'Next: Forecast' }).click();
  await page.screenshot({ path: '/downloads/p4-forecast-farmland.png', fullPage: true });

  // Three map themes on the whale scenario.
  for (const site of ['megasite', 'farmland', 'quarry-ridge']) {
    await startCampaign(page, site);
    await page.screenshot({ path: `/downloads/p4-map-${site}.png` });
  }
});

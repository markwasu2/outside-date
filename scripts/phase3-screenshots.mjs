/* global console, window, localStorage */
// Phase 3 screenshots at 800px and 1440px. Run with the dev server up on :5173.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const OUT = 'docs/screenshots/phase3';
const WIDTHS = [{ n: '800', width: 800, height: 700 }, { n: '1440', width: 1440, height: 900 }];
mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w.width, height: w.height });
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/${name}-${w.n}.png` });
  }
  console.log('shot', name);
}
async function clearExplainers(page) {
  for (let i = 0; i < 8; i += 1) {
    const up = await page.locator('[data-testid^="stat-explainer-"]').first().waitFor({ timeout: 600 }).then(() => true).catch(() => false);
    if (!up) return;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
  }
}
async function newWhale(page) {
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE);
  await page.locator('select').first().selectOption('whale');
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('button', { name: 'Next: Lease' }).click();
  await page.getByRole('button', { name: 'Next: Forecast' }).click();
}

const browser = await chromium.launch();
const page = await browser.newPage();
await newWhale(page);
await page.getByTestId('forecast-step').waitFor();
await shot(page, 'p3-01-wizard-forecast');
await page.getByRole('button', { name: 'Next: Capital stack' }).click();
await page.getByRole('button', { name: 'Next: Power' }).click();
await page.getByRole('button', { name: 'Next: Insurance' }).click();
await page.getByRole('button', { name: 'Start campaign' }).click();
await clearExplainers(page);

// Runway warning deep-links to the Capital tab.
await page.evaluate(() => window.__debugSetCash(9_000_000));
await page.waitForTimeout(300);
await shot(page, 'p3-03-runway-warning');
await page.getByRole('button', { name: /Raise capital/ }).first().click();
await page.getByTestId('capital-summary').waitFor();
await shot(page, 'p3-03b-warning-deeplinked-capital');

// Take a lever: queue the bridge loan and end the month.
await page.getByRole('button', { name: /sponsor bridge loan/i }).first().click();
await page.getByRole('button', { name: 'End month' }).click();
await clearExplainers(page);
for (let i = 0; i < 3; i += 1) {
  const c = page.getByTestId('event-choice');
  if ((await c.count()) > 0) await c.first().click();
}
await page.getByTestId('track-tab-capital').click();
await page.getByTestId('capital-log').waitFor();
await shot(page, 'p3-02-capital-tab-lever-taken');

// Loss cards.
await page.evaluate(() => window.__debugLoss('theft'));
await page.getByTestId('claim-breakdown').waitFor();
await shot(page, 'p3-04-small-loss-card');
await page.getByTestId('event-choice').first().click();
await page.evaluate(() => window.__debugLoss('storm'));
await page.getByTestId('claim-breakdown').waitFor();
await shot(page, 'p3-05-catastrophe-card');
await browser.close();

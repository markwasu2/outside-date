/* global console, localStorage */
// UX 1 goal strip screenshots at 800px and 1440px (top of board, whale scenario).
// Run with the dev server up on :5173.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const OUT = 'docs/screenshots/ux1';
mkdirSync(OUT, { recursive: true });

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
  await page.getByRole('button', { name: 'Next: Capital stack' }).click();
  await page.getByRole('button', { name: 'Next: Power' }).click();
  await page.getByRole('button', { name: 'Next: Insurance' }).click();
  await page.getByRole('button', { name: 'Start campaign' }).click();
  await clearExplainers(page);
}

const browser = await chromium.launch();
const page = await browser.newPage();
await newWhale(page);
for (const w of [{ n: '800', width: 800, height: 700 }, { n: '1440', width: 1440, height: 900 }]) {
  await page.setViewportSize({ width: w.width, height: w.height });
  await page.waitForTimeout(350);
  await page.locator('[data-testid="goal-strip"]').screenshot({ path: `${OUT}/goal-strip-${w.n}.png` });
  console.log('strip', w.n, await page.locator('[data-testid="goal-strip"]').innerText());
}
await browser.close();

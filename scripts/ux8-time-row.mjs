/* global console, localStorage, window */
// UX 7: time-row headline. Dev server on :5173.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const OUT = 'docs/screenshots/ux8';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 1200 });
await page.goto(BASE);
let landed = false;
for (const seed of [1, 2, 3, 4, 5, 6]) {
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE);
  await page.evaluate((s) => window.__debugRunBot('greedy', 'whale', 'normal', s), seed);
  await page.waitForTimeout(400);
  // Click through the rating-scene interstitial if the run reached the takeout.
  for (let i = 0; i < 3; i += 1) {
    const h = await page.locator('h1').first().textContent().catch(() => '');
    if (!/Rating the campus/.test(h ?? '')) break;
    await page.getByRole('button').last().click();
    await page.waitForTimeout(900);
  }
  const heading = (await page.locator('h1').first().textContent().catch(() => '')) ?? '';
  console.log('seed', seed, '->', heading);
  if (/scraped/i.test(heading)) {
    await page.screenshot({ path: `${OUT}/time-row-1440.png`, fullPage: true });
    landed = true;
    break;
  }
}
console.log(landed ? 'shot taken' : 'no scraped ending found in seeds tried');
await browser.close();

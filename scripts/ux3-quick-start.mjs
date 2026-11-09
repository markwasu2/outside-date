/* global console, localStorage */
// UX 3 quick start screenshots. Run with the dev server up on :5173.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const OUT = 'docs/screenshots/ux3';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE);
for (const w of [{ n: '800', width: 800, height: 700 }, { n: '1440', width: 1440, height: 900 }]) {
  await page.setViewportSize({ width: w.width, height: w.height });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/title-${w.n}.png` });
}
console.log('title shots');
await browser.close();

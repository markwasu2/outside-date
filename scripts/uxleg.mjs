/* global localStorage, window */
// UX legibility: hall captions, fixed-tile state words, collapsible legend. Desktop 1440.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const OUT = 'docs/screenshots/ux-legibility';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto('http://localhost:5173');
await page.evaluate(() => localStorage.clear());
await page.goto('http://localhost:5173');
await page.locator('select').first().selectOption('whale');
await page.getByTestId('quick-start').click();
await page.evaluate(() => window.__debugBotToFirstDelivery('careful', 'whale', 'normal', 2));
await page.waitForTimeout(500);
for (let i = 0; i < 8; i += 1) {
  const up = await page.locator('[data-testid^="stat-explainer-"]').first().waitFor({ timeout: 400 }).then(() => true).catch(() => false);
  if (!up) break;
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
}
// Dismiss any lingering notice cards so the board reads clean.
for (let i = 0; i < 4; i += 1) {
  const d = page.getByTestId('event-notice-dismiss').first();
  if ((await d.count()) === 0) break;
  await d.click();
  await page.waitForTimeout(100);
}
await page.screenshot({ path: `${OUT}/board-captions-desktop-1440.png` });
await page.getByTestId('board-legend-toggle').click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/legend-open-desktop-1440.png` });
console.log('saved both');
await browser.close();

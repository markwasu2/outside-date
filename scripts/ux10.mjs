/* global console, localStorage, window */
// UX 10: explained warnings - LD/abatement warning cards from lease.ts + HUD markets strip.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const OUT = 'docs/screenshots/ux10';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto('http://localhost:5173');
await page.evaluate(() => localStorage.clear());
await page.goto('http://localhost:5173');
await page.locator('select').first().selectOption('whale');
await page.getByTestId('quick-start').click();
await page.evaluate(() => window.__debugBotToFirstDelivery('greedy', 'whale', 'normal', 7));
await page.waitForTimeout(600);
for (let i = 0; i < 8; i += 1) {
  const up = await page.locator('[data-testid^="stat-explainer-"]').first().waitFor({ timeout: 400 }).then(() => true).catch(() => false);
  if (!up) break;
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
}
const n = await page.getByTestId('event-notice').count();
console.log('notices visible:', n);
const txt = n > 0 ? await page.getByTestId('event-notice').first().innerText() : '';
console.log('first card:', txt.slice(0, 300));
await page.screenshot({ path: `${OUT}/ld-notice-desktop-1440.png` });
const rising = await page.getByTestId('hud-markets-rising').count();
console.log('markets-rising visible:', rising);
if (rising > 0) {
  const strip = page.getByTestId('hud-markets-rising');
  await strip.scrollIntoViewIfNeeded();
  const box = await strip.boundingBox();
  await page.screenshot({
    path: `${OUT}/hud-markets-rising-desktop-1440.png`,
    clip: { x: 0, y: 0, width: 1440, height: Math.min(200, box.y + box.height + 20) },
  });
  console.log('markets text:', await strip.innerText());
}
await browser.close();

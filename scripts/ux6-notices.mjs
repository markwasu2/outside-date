/* global console, localStorage, window */
// UX 6: event notice cards with stakes. Bot run fires no-choice events/warnings instantly.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const OUT = 'docs/screenshots/ux6';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto('http://localhost:5173');
await page.evaluate(() => localStorage.clear());
await page.goto('http://localhost:5173');
await page.locator('select').first().selectOption('whale');
await page.getByTestId('quick-start').click();
await page.evaluate(() => window.__debugBotToFirstDelivery('careful', 'whale', 'normal', 7));
await page.waitForTimeout(600);
for (let i = 0; i < 8; i += 1) {
  const up = await page.locator('[data-testid^="stat-explainer-"]').first().waitFor({ timeout: 400 }).then(() => true).catch(() => false);
  if (!up) break;
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
}
const n = await page.getByTestId('event-notice').count();
console.log('notices visible:', n);
if (n > 0) {
  await page.screenshot({ path: `${OUT}/notice-cards-desktop-1440.png` });
  console.log('saved');
} else {
  console.log('NO NOTICES - try another seed');
}
await browser.close();

/* global localStorage, window, document */
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });
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
const metrics = await page.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
  scrollH: document.documentElement.scrollHeight,
  clientH: document.documentElement.clientHeight,
}));
console.log('page metrics', JSON.stringify(metrics));
await page.screenshot({ path: '/tmp/ux4-1280.png' });
await browser.close();

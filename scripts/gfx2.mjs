/* global console, localStorage, window */
// GFX 2 shot 1: mid-game board - vehicle on an active stage, equipment row, cooling gear.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const OUT = 'docs/screenshots/gfx2';
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
await page.waitForTimeout(400);
for (let i = 0; i < 8; i += 1) {
  const up = await page.locator('[data-testid^="stat-explainer-"]').first().waitFor({ timeout: 400 }).then(() => true).catch(() => false);
  if (!up) break;
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
}
for (let i = 0; i < 4; i += 1) {
  const d = page.getByTestId('event-notice-dismiss').first();
  if ((await d.count()) === 0) break;
  await d.click();
  await page.waitForTimeout(80);
}
// Queue advances on idle halls so their vehicles show in the folded draft.
await page.getByRole('button', { name: 'Construction', exact: true }).click();
const advs = page.getByTestId('action-row-button').filter({ hasText: /Break ground|Advance construction/ });
const n = await advs.count();
for (let i = 0; i < n; i += 1) {
  const b = advs.nth(i);
  if (await b.isEnabled()) { await b.click(); await page.waitForTimeout(100); }
}
console.log('vehicles:', await page.getByTestId('stage-vehicle').count(),
  'equip-xfmr:', await page.getByTestId('equip-transformer').count(),
  'equip-swgr:', await page.getByTestId('equip-switchgear').count(),
  'cooling:', await page.getByTestId('equip-cooling').count());
await page.screenshot({ path: `${OUT}/board-desktop-1440.png` });
console.log('saved');
await browser.close();

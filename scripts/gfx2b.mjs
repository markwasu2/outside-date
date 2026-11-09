/* global localStorage, window */
// GFX 2 shot 2: the delivery truck in the laydown yard on the arrival month.
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
for (let i = 0; i < 8; i += 1) {
  const up = await page.locator('[data-testid^="stat-explainer-"]').first().waitFor({ timeout: 400 }).then(() => true).catch(() => false);
  if (!up) break;
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
}
// Order both long-lead units.
await page.getByTestId('track-tab-power').click();
const order = async (name) => {
  const b = page.getByTestId('action-row-button').filter({ hasText: name }).first();
  if ((await b.count()) > 0 && (await b.isEnabled())) await b.click();
};
await order('Commission the interconnection study');
await order('Order the transformer');
await order('Order the switchgear');
const dialog = page.getByRole('dialog');
let found = false;
for (let m = 0; m < 30; m += 1) {
  if ((await dialog.count()) > 0) { await page.getByTestId('event-choice').first().click(); continue; }
  if ((await page.getByTestId('delivery-truck').count()) > 0) { found = true; break; }
  // keep construction moving so the run stays healthy
  await page.getByRole('button', { name: 'Construction', exact: true }).click();
  const adv = page.getByTestId('action-row-button').filter({ hasText: /Break ground|Advance construction/ });
  if ((await adv.count()) > 0 && (await adv.first().isEnabled())) await adv.first().click();
  await page.getByRole('button', { name: 'End month' }).click();
  await page.waitForTimeout(100);
}
console.log('truck found:', found, 'month:', await page.locator('strong').first().textContent());
if (found) {
  for (let i = 0; i < 4; i += 1) {
    const d = page.getByTestId('event-notice-dismiss').first();
    if ((await d.count()) === 0) break;
    await d.click();
    await page.waitForTimeout(80);
  }
  await page.screenshot({ path: `${OUT}/delivery-truck-desktop-1440.png` });
  console.log('saved truck shot');
}
await browser.close();

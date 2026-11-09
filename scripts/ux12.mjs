/* global localStorage */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const OUT = 'docs/screenshots/ux12';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto('http://localhost:5173');
await page.evaluate(() => localStorage.clear());
await page.goto('http://localhost:5173');
await page.locator('select').first().selectOption('whale');
await page.getByRole('button', { name: 'New game' }).click();
// walk the wizard: land, docket/permits screens vary; click Next until Insurance
for (const n of ['Next: Lease', 'Next: Forecast', 'Next: Capital stack', 'Next: Power', 'Next: Insurance']) {
  const b = page.getByRole('button', { name: n });
  if (await b.count()) { await b.click(); }
}
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/dsu-off-desktop-1440.png` });
await page.getByTestId('dsu-toggle').check();
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/dsu-on-desktop-1440.png` });
console.log('off text:', (await page.getByTestId('dsu-stakes-on').innerText()).slice(0, 200));
await browser.close();

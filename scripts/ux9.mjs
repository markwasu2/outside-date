/* global console, localStorage */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const OUT = 'docs/screenshots/ux9';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto('http://localhost:5173');
await page.evaluate(() => localStorage.clear());
await page.goto('http://localhost:5173');
await page.getByRole('button', { name: 'Tutorial' }).click();
const dialog = page.getByRole('dialog');
for (let i = 0; i < 4 && (await dialog.count()) === 0; i += 1) {
  await page.getByRole('button', { name: 'End month' }).click();
}
await dialog.waitFor();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/governor-stakes-desktop-1440.png` });
console.log(await dialog.innerText());
await browser.close();

/* global console, localStorage */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const OUT = 'docs/screenshots/ux11';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto('http://localhost:5173');
await page.evaluate(() => localStorage.clear());
await page.goto('http://localhost:5173');
await page.locator('select').first().selectOption('whale');
await page.getByTestId('quick-start').click();
await page.getByTestId('score-rules-toggle').click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/score-panel-desktop-1440.png`, clip: { x: 0, y: 0, width: 1440, height: 320 } });
console.log(await page.getByTestId('score-rules-panel').innerText());
await browser.close();

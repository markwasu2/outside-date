/* global window, console */
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:5173');
await p.waitForFunction(() => typeof window.__debugBotToFirstDelivery === 'function');
await p.evaluate(() => window.__debugBotToFirstDelivery('competent', 'whale', 'normal', 2));
await p.waitForTimeout(200);
for (const el of await p.locator('[role="button"][title]').all()) {
  const t = await el.getAttribute('title');
  if (/^H\d/.test(t)) console.log(t);
}
await b.close();

/* global console, localStorage, window */
// GFX 1: board screenshots with the isometric tile art, at desktop + phone widths.
// Uses the dev-only bot hook to land a mid-game board (halls at mixed stages).
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const OUT = 'docs/screenshots/gfx1';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function boardAt(width, height, name) {
  const page = await browser.newPage();
  await page.setViewportSize({ width, height });
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE);
  await page.locator('select').first().selectOption('whale');
  await page.getByTestId('quick-start').click();
  await page.evaluate(() => window.__debugBotToFirstDelivery('careful', 'whale', 'normal', 2));
  await page.waitForTimeout(500);
  // Dismiss any stat explainer.
  for (let i = 0; i < 8; i += 1) {
    const up = await page.locator('[data-testid^="stat-explainer-"]').first().waitFor({ timeout: 400 }).then(() => true).catch(() => false);
    if (!up) break;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  console.log('saved', name);
  await page.close();
}

await boardAt(1440, 900, 'board-desktop-1440');
await boardAt(390, 844, 'board-phone-390');
await browser.close();

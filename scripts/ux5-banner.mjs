/* global console, localStorage */
// UX 5: next-step transformer card with the lateness note. Dev server on :5173.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const OUT = 'docs/screenshots/ux5';
mkdirSync(OUT, { recursive: true });

async function clearExplainers(page) {
  for (let i = 0; i < 8; i += 1) {
    const up = await page.locator('[data-testid^="stat-explainer-"]').first().waitFor({ timeout: 600 }).then(() => true).catch(() => false);
    if (!up) return;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE);
await page.locator('select').first().selectOption('whale');
await page.getByTestId('quick-start').click();
await clearExplainers(page);

// Month 1: commission the study.
await page.getByTestId('track-tab-power').click();
await page.getByRole('button', { name: /Commission the interconnection study/ }).click();

// Then file every permit, ending months as AP runs out, until the transformer card shows.
for (let m = 0; m < 6; m += 1) {
  await page.getByTestId('track-tab-regulation').click();
  const enabled = page.locator('button[data-testid="action-row-button"]:enabled', { hasText: /^File \w+ permit/ });
  while ((await enabled.count()) > 0) {
    await enabled.first().click();
    await page.waitForTimeout(150);
  }
  await page.getByRole('button', { name: 'End month' }).click();
  await clearExplainers(page);
  const card = await page.getByTestId('next-step-card').innerText();
  console.log(`month tick ${m}:`, card.split('\n')[0]);
  if (/transformer/i.test(card)) break;
}
console.log('card:', await page.getByTestId('next-step-card').innerText());
for (const w of [{ n: '1440', width: 1440, height: 900 }, { n: '800', width: 800, height: 700 }]) {
  await page.setViewportSize({ width: w.width, height: w.height });
  await page.getByTestId('next-step-card').waitFor();
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/board-${w.n}.png` });
}
await browser.close();

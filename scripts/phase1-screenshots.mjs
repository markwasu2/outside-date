// Phase 1 screenshot capture: drives the dev server through the six required board states at two
// viewport widths and saves PNGs to /downloads/shots/. Run: node scripts/phase1-screenshots.mjs
// (dev server must already be running on :5173).
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const OUT = '/downloads/shots';
const WIDTHS = [
  { name: '800', width: 800, height: 600 },
  { name: '1440', width: 1440, height: 900 },
];

async function dismissEventIfUp(page) {
  // Coach tips are their own overlay with a single "Got it" and block End month while up.
  const gotIt = page.getByRole('button', { name: 'Got it' });
  if ((await gotIt.count()) > 0) {
    await gotIt.click();
    return true;
  }
  const dialog = page.getByRole('dialog');
  if ((await dialog.count()) > 0) {
    await page.getByTestId('event-choice').first().click();
    return true;
  }
  return false;
}

async function endMonths(page, n) {
  for (let i = 0; i < n; i += 1) {
    if (await dismissEventIfUp(page)) { i -= 1; continue; }
    try {
      await page.getByRole('button', { name: 'End month' }).click({ timeout: 5000 });
    } catch {
      return; // takeout window open / unresolved choice - the run is effectively over
    }
  }
}

async function shot(page, name) {
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w.width, height: w.height });
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/${name}-${w.name}.png` });
  }
  console.log('shot', name);
}

const browser = await chromium.launch();
const page = await browser.newPage();

// 1. Tutorial month 0
await page.goto(BASE);
await page.getByRole('button', { name: 'Tutorial' }).click();
await page.waitForTimeout(300);
await shot(page, '01-tutorial-month0');

// 5 (prep): queue the study, then the switchgear so it arrives in a few months.
await page.getByRole('button', { name: /Substation/ }).click();
await page.getByTestId('map-popover').getByTestId('popover-action').filter({ hasText: 'interconnection study' }).click();
await endMonths(page, 1);
await page.getByRole('button', { name: /Substation/ }).click();
await page.getByTestId('map-popover').getByTestId('popover-action').filter({ hasText: 'switchgear' }).click();
// Screenshot aid only: top up cash so a scripted-event drain can't end the run mid-capture.
await page.evaluate(() => window.__debugSetCash(50000000));

// 6. Critical-runway warning
await page.evaluate(() => window.__debugSetCash(1));
await page.waitForTimeout(400);
await shot(page, '06-critical-runway-warning');

// 3. Whale month 0 (fresh page)
await page.goto(BASE);
await page.locator('select').first().selectOption('whale');
await page.getByRole('button', { name: 'New game' }).click();
await page.getByRole('button', { name: 'Next: Lease' }).click();
await page.getByRole('button', { name: 'Next: Capital stack' }).click();
await page.getByRole('button', { name: 'Next: Power' }).click();
await page.getByRole('button', { name: 'Next: Insurance' }).click();
await page.getByRole('button', { name: 'Start campaign' }).click();
await page.waitForTimeout(300);
await shot(page, '03-whale-month0');

// 4. Delivered hall with rent ticker
await page.goto(BASE);
await page.waitForFunction(() => typeof window.__debugBotToFirstDelivery === 'function');
await page.evaluate(() => window.__debugBotToFirstDelivery('competent', 'whale', 'normal', 2));
await page.waitForTimeout(300);
await shot(page, '04-delivered-hall-rent-ticker');

// 5. Purchased-part arrival, from the same bot state: the laydown yard holds the arrived
// transformer + switchgear crates ("on site") - the arrival end state (D9).
await page.getByRole('button', { name: /Laydown yard/ }).click();
await page.waitForTimeout(200);
await shot(page, '05-part-arrival-laydown');
await page.keyboard.press('Escape');

// 2. Mid-construction hall (D2 growth): H5 sits at Shell at first delivery; the steel stage is
// transient (the bot builds in parallel past it), so pad (earlier tutorial shot) + shell here
// bracket the growth curve. Click H5 to show its popover too.
await page.locator('[role="button"][title="H5: Shell"]').click();
await page.waitForTimeout(200);
await shot(page, '02-hall-shell');

await browser.close();
console.log('done');

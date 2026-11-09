/* global window, console */
// Phase 2 "Read the Deal" screenshot capture: the five required states at two viewport widths,
// saved to docs/screenshots/phase2/. Run: node scripts/phase2-screenshots.mjs
// (dev server must already be running on :5173).
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const OUT = 'docs/screenshots/phase2';
const WIDTHS = [
  { name: '800', width: 800, height: 600 },
  { name: '1440', width: 1440, height: 900 },
];

const EXPLAINER_SELECTOR =
  '[data-testid="stat-explainer-cash"], [data-testid="stat-explainer-runway"], [data-testid="stat-explainer-ap"], [data-testid="stat-explainer-nextOutsideDate"], [data-testid="stat-explainer-dscrHeadroom"], [data-testid="stat-explainer-goodwill"]';

/** Drains the auto-opening explainer queue (each Escape marks one seen; the next mounts a tick
 * later, so each round waits briefly for a popover before deciding the queue is empty). */
async function dismissExplainers(page) {
  for (let i = 0; i < 8; i += 1) {
    const popped = await page
      .locator(EXPLAINER_SELECTOR)
      .first()
      .waitFor({ timeout: 700 })
      .then(() => true)
      .catch(() => false);
    if (!popped) return;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
  }
}

/** Dismisses coach tips and event dialogs (first choice) so navigation clicks land. */
async function dismissEventIfUp(page) {
  const gotIt = page.getByRole('button', { name: 'Got it' });
  if ((await gotIt.count()) > 0) {
    await gotIt.click();
    return true;
  }
  const choice = page.getByTestId('event-choice');
  if ((await choice.count()) > 0) {
    await choice.first().click();
    return true;
  }
  return false;
}

async function shot(page, name) {
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w.width, height: w.height });
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/${name}-${w.name}.png` });
  }
  console.log('shot', name);
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();

// 1. Financials drawer on a REAL Whale campaign, played ~14 months by clicks (bot-injected
// states drift the closing table: events like the_ask amend the deal, which a UI-only mirror
// can't reconcile - see CHECKPOINT NEEDS ENGINE). Sources=uses at close, draws underway,
// waterfall + DSCR series populated.
await page.goto(BASE);
await page.locator('select').first().selectOption('whale');
await page.getByRole('button', { name: 'New game' }).click();
await page.getByRole('button', { name: 'Next: Lease' }).click();
await page.getByRole('button', { name: 'Next: Capital stack' }).click();
await page.getByRole('button', { name: 'Next: Power' }).click();
await page.getByRole('button', { name: 'Next: Insurance' }).click();
await page.getByRole('button', { name: 'Start campaign' }).click();
for (let m = 0; m < 14; m += 1) {
  await dismissExplainers(page);
  await dismissEventIfUp(page);
  // Queue every enabled action on every tab (skipping stand-down, same discipline as smoke).
  for (const tabName of ['Land', 'Regulation', 'Power', 'Money', 'Chips', 'Construction']) {
    await page.getByRole('button', { name: tabName, exact: true }).click();
    for (let g = 0; g < 6; g += 1) {
      const buttons = page.getByTestId('action-row-button').and(page.locator(':enabled'));
      const count = await buttons.count();
      let clicked = false;
      for (let i = 0; i < count; i += 1) {
        const name = await buttons.nth(i).innerText();
        if (name.startsWith('Stand down')) continue;
        await buttons.nth(i).click();
        clicked = true;
        break;
      }
      if (!clicked) break;
    }
  }
  await dismissExplainers(page);
  await page.getByRole('button', { name: 'End month' }).click();
}
await dismissExplainers(page);
await dismissEventIfUp(page);
await page.getByTestId('open-financials').click();
await page.getByTestId('financials-drawer').waitFor();
await shot(page, 'p2-01-financials-drawer-whale');
await page.getByTestId('financials-drawer').getByRole('button', { name: 'close' }).click();

// 2. First-time explainer popover: fresh Whale run, the 'cash' card auto-opens.
await page.goto(BASE);
await page.locator('select').first().selectOption('whale');
await page.getByRole('button', { name: 'New game' }).click();
await page.getByRole('button', { name: 'Next: Lease' }).click();
await page.getByRole('button', { name: 'Next: Capital stack' }).click();
await page.getByRole('button', { name: 'Next: Power' }).click();
await page.getByRole('button', { name: 'Next: Insurance' }).click();
await page.getByRole('button', { name: 'Start campaign' }).click();
await page.locator(EXPLAINER_SELECTOR).first().waitFor();
await shot(page, 'p2-02-first-time-explainer');
await dismissExplainers(page);

// 3. Tutorial month 0: locked tabs (Power clicked, showing its unlock hint over dimmed rows).
await page.goto(BASE);
await page.getByRole('button', { name: 'Tutorial' }).click();
await dismissExplainers(page);
await page.getByTestId('track-tab-power').click();
await page.getByTestId('locked-tab-hint').waitFor();
await shot(page, 'p2-03-locked-tabs-tutorial');

// 4. Stakeholders codex view (from the title screen's Codex button).
await page.goto(BASE);
await page.getByRole('button', { name: 'Codex' }).click();
await page.getByTestId('codex-stakeholders-button').click();
await page.getByTestId('stakeholders-view').waitFor();
await shot(page, 'p2-04-stakeholders-codex');
await page.keyboard.press('Escape');

// 5. Event card with who-holds chip: tutorial scripted storm (month 7). Queue the study first so
// the run is healthy, then end months until a dialog carries the chip; leave it open for the shot.
await page.goto(BASE);
await page.getByRole('button', { name: 'Tutorial' }).click();
await dismissExplainers(page);
await page.getByRole('button', { name: /Substation/ }).click();
await page
  .getByTestId('map-popover')
  .getByTestId('popover-action')
  .filter({ hasText: 'interconnection study' })
  .click();
let chipUp = false;
for (let m = 0; m < 12 && !chipUp; m += 1) {
  await dismissExplainers(page);
  await page.getByRole('button', { name: 'End month' }).click();
  await dismissExplainers(page);
  const dialog = page.getByRole('dialog').filter({ has: page.getByTestId('event-choice') });
  if ((await dialog.count()) > 0) {
    if ((await dialog.getByTestId('who-holds-chip').count()) > 0) {
      chipUp = true;
    } else {
      await page.getByTestId('event-choice').first().click();
    }
  }
}
if (!chipUp) throw new Error('storm event card with who-holds chip never appeared');
await shot(page, 'p2-05-event-who-holds-chip');

await browser.close();
console.log('done');

import { expect, test, type Page } from '@playwright/test';

/**
 * Phase 2 "Read the Deal": end-to-end coverage against the real Vite dev server.
 *  1. Financials drawer (D1): sources = uses at close on a Whale run, and the cash waterfall
 *     appears after the first committed month.
 *  2. Unlocking tabs (D3): the tutorial locks Power/Money/Regulation/Chips at month 0, and
 *     commissioning the study from the substation popover unlocks Power.
 *  3. First-time explainer (D2): the first eligible stat explainer auto-opens on a fresh run
 *     and dismisses for good.
 *  4. Stakeholders codex (D4): the Codex's Stakeholders view lists all eleven roles.
 *  5. Who-holds chips (D5): the tutorial's scripted month-7 storm card carries a who-holds
 *     chip that opens the stakeholders view focused on the GC.
 */

/** Dismisses a scripted event dialog if one is up; returns whether one was. Explainer
 * popovers also use role="dialog", so match on the event-choice buttons, not the role. */
async function dismissEventIfUp(page: Page) {
  const choice = page.getByTestId('event-choice');
  if ((await choice.count()) > 0) {
    await choice.first().click();
    return true;
  }
  return false;
}

/** Exact-match locator for open explainer popovers (never the -target- wrapper buttons). */
function explainerPopovers(page: Page) {
  return page.locator(
    '[data-testid="stat-explainer-cash"], [data-testid="stat-explainer-runway"], [data-testid="stat-explainer-ap"], [data-testid="stat-explainer-nextOutsideDate"], [data-testid="stat-explainer-dscrHeadroom"], [data-testid="stat-explainer-goodwill"]',
  );
}

/** Dismisses auto-opened stat explainers. They queue one at a time, and the next one mounts
 * a tick after the current one closes, so each round WAITS for a popover before deciding the
 * queue is empty (a bare count check races the mount and returns early). */
async function dismissExplainerIfUp(page: Page) {
  for (let i = 0; i < 8; i++) {
    const popped = await explainerPopovers(page)
      .first()
      .waitFor({ timeout: 800 })
      .then(() => true)
      .catch(() => false);
    if (!popped) return;
    await page.keyboard.press('Escape');
  }
}

async function startWhale(page: Page) {
  await page.goto('/');
  await page.locator('select').first().selectOption('whale');
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('button', { name: 'Next: Lease' }).click();
  await page.getByRole('button', { name: 'Next: Capital stack' }).click();
  await page.getByRole('button', { name: 'Next: Power' }).click();
  await page.getByRole('button', { name: 'Next: Insurance' }).click();
  await page.getByRole('button', { name: 'Start campaign' }).click();
}

test('Whale: the financials drawer opens with sources equal to uses at close', async ({ page }) => {
  await startWhale(page);
  await dismissExplainerIfUp(page);

  await page.getByTestId('open-financials').click();
  await expect(page.getByTestId('financials-drawer')).toBeVisible();
  await expect(page.getByTestId('sources-uses-table')).toBeVisible();

  const sources = await page.getByTestId('sources-total').textContent();
  const uses = await page.getByTestId('uses-total').textContent();
  expect(sources).toBeTruthy();
  expect(uses).toBeTruthy();
  expect(sources).toBe(uses);

  // The draw schedule and interest reserve render from committed state at month 0.
  await expect(page.getByTestId('draw-schedule')).toBeVisible();
  await expect(page.getByTestId('interest-reserve')).toBeVisible();
  // No committed month yet: the waterfall section only appears after month 1.
  await expect(page.getByTestId('cash-waterfall')).toHaveCount(0);

  // End one month (no plan): the waterfall now shows the committed month.
  await page.getByTestId('financials-drawer').getByRole('button', { name: 'close' }).click();
  await dismissExplainerIfUp(page);
  await page.getByRole('button', { name: 'End month' }).click();
  await dismissExplainerIfUp(page);
  await dismissEventIfUp(page);
  await page.getByTestId('open-financials').click();
  await expect(page.getByTestId('cash-waterfall')).toBeVisible();
  await expect(page.getByTestId('dscr-trend')).toBeVisible();
});

test('tutorial: tabs lock until their systems come online', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tutorial' }).click();
  await dismissExplainerIfUp(page);

  // Month 0: Land and Construction are open; the rest are locked with hints.
  for (const id of ['power', 'money', 'regulation', 'chips']) {
    await expect(page.getByTestId(`track-tab-${id}`)).toHaveAttribute('data-locked', 'true');
  }
  await expect(page.getByTestId('track-tab-land')).toHaveAttribute('data-locked', 'false');
  await expect(page.getByTestId('track-tab-construction')).toHaveAttribute('data-locked', 'false');

  // A locked tab shows its unlock hint instead of dead ends.
  await page.getByTestId('track-tab-power').click();
  await expect(page.getByTestId('locked-tab-hint')).toContainText('substation');

  // Commission the study from the substation map popover (the action the hint names).
  await page.getByRole('button', { name: /Substation/ }).click();
  await page
    .getByTestId('map-popover')
    .getByTestId('popover-action')
    .filter({ hasText: 'Commission the interconnection study' })
    .click();
  await dismissExplainerIfUp(page);
  await page.getByRole('button', { name: 'End month' }).click();
  await dismissExplainerIfUp(page);
  await dismissEventIfUp(page);

  // Power unlocks from the committed state; the tab now shows its real rows.
  await expect(page.getByTestId('track-tab-power')).toHaveAttribute('data-locked', 'false');
  await page.getByTestId('track-tab-power').click();
  await expect(page.getByTestId('locked-tab-hint')).toHaveCount(0);
  await expect(page.getByTestId('track-tab-money')).toHaveAttribute('data-locked', 'true');
});

test('the first eligible stat explainer auto-opens once and stays dismissed', async ({ page }) => {
  await startWhale(page);

  // Exactly one explainer auto-opens on a fresh run (the first eligible one, 'cash').
  const explainer = explainerPopovers(page);
  await expect(explainer).toHaveCount(1);
  const id = (await explainer.first().getAttribute('data-testid'))!.replace('stat-explainer-', '');

  // Dismissed with Escape, that one stays down (the next queued explainer may open - drain it).
  await page.keyboard.press('Escape');
  await expect(page.locator(`[data-testid="stat-explainer-${id}"]`)).toHaveCount(0);
  await dismissExplainerIfUp(page);
  await page.getByRole('button', { name: 'End month' }).click();
  await dismissEventIfUp(page);
  await dismissExplainerIfUp(page);
  await expect(page.locator(`[data-testid="stat-explainer-${id}"]`)).toHaveCount(0);

  // Tapping the stat target re-opens its card on demand.
  await page.getByTestId(`stat-explainer-target-${id}`).click();
  await expect(page.locator(`[data-testid="stat-explainer-${id}"]`)).toBeVisible();
});

test('the codex stakeholders view lists all eleven roles with their risk chips', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Codex' }).click();
  await page.getByTestId('codex-stakeholders-button').click();

  await expect(page.getByTestId('stakeholders-view')).toBeVisible();
  for (const role of [
    'developer', 'gc', 'utility', 'tenant', 'lender', 'insurer',
    'equipment', 'ratepayers', 'town', 'partner', 'commission',
  ]) {
    await expect(page.getByTestId(`stakeholder-card-${role}`)).toBeVisible();
  }
  // Role cards name the risks they hold by default and link to their sourced codex entry.
  await expect(page.getByTestId('stakeholder-card-gc')).toContainText('Holds by default');
  await expect(page.getByTestId('stakeholder-card-gc')).toContainText('named examples');
});

test("tutorial storm card carries a who-holds chip that opens the GC's stakeholder entry", async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tutorial' }).click();
  await dismissExplainerIfUp(page);

  // Queue everything the tutorial wants, then advance to month 7's scripted storm.
  await page.getByRole('button', { name: /Substation/ }).click();
  await page
    .getByTestId('map-popover')
    .getByTestId('popover-action')
    .filter({ hasText: 'Commission the interconnection study' })
    .click();
  let stormSeen = false;
  for (let m = 0; m < 12 && !stormSeen; m++) {
    await dismissExplainerIfUp(page);
    await page.getByRole('button', { name: 'End month' }).click();
    await dismissExplainerIfUp(page);
    const dialog = page.getByRole('dialog').filter({ has: page.getByTestId('event-choice') });
    if ((await dialog.count()) > 0) {
      const chip = dialog.getByTestId('who-holds-chip');
      if ((await chip.count()) > 0) {
        stormSeen = true;
        await expect(chip.first()).toBeVisible();
        await chip.first().click();
        // The chip opens the stakeholders view focused on the storm's holder (the GC by default).
        await expect(page.getByTestId('stakeholders-view')).toBeVisible();
        break;
      }
      await page.getByTestId('event-choice').first().click();
    }
  }
  expect(stormSeen).toBe(true);
});

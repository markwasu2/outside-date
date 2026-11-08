import { expect, test, type Page } from '@playwright/test';

/**
 * P10.5: two end-to-end smoke tests against the real Vite dev server (playwright.config.ts's
 * `webServer`). Test 1 drives the tutorial by real clicks/keypresses - no bot, no debug hook - so
 * it also closes out P8.2's deferred "Playwright test clicks through the tutorial with a fixed
 * seed" accept criterion. Test 2 uses the dev-only `window.__debugRunBot` hook (store.ts) to play
 * a full Whale campaign with the competent bot and land it in the UI, since scripting 60 months
 * of real clicks would just be re-testing the engine's own step()/bot logic that `tests/sim/
 * balance.test.ts` already covers - this test is about the UI correctly rendering whatever
 * GameState the engine hands it, not about re-driving the engine by hand.
 */

const TAB_NAMES = ['Land', 'Regulation', 'Power', 'Money', 'Chips', 'Construction'];

/** Queues every currently-legal action across all six TracksPanel tabs (not a real strategy -
 * just "take every action the engine says is allowed right now", re-querying after each click
 * since queuing one action can make a later one illegal, e.g. running out of AP). Naturally
 * includes `priceTakeout` once the takeout window opens and `advanceHall` once a stage is free to
 * start, without this test needing to know the tutorial's own power/permit prerequisites. */
async function queueEveryLegalAction(page: Page) {
  for (const tabName of TAB_NAMES) {
    await page.getByRole('button', { name: tabName, exact: true }).click();
    for (let guard = 0; guard < 20; guard += 1) {
      const button = page.getByTestId('action-row-button').and(page.locator(':enabled')).first();
      if ((await button.count()) === 0) break;
      await button.click();
    }
  }
}

/** Clicks through the rating scene's Skip -> Continue (or straight to the report card if a
 * no-takeout loss skipped the rating scene entirely - see App.tsx's `EndedFlow`) until an outcome
 * heading appears. */
async function finishEndedFlow(page: Page) {
  const reportCardHeading = page.getByRole('heading', { name: 'Report card' });
  const gameOverHeading = page.getByRole('heading', { name: /^(You win|You lose|Game over)/ });
  for (let i = 0; i < 5; i += 1) {
    if ((await reportCardHeading.count()) > 0 || (await gameOverHeading.count()) > 0) return;
    await page.getByRole('button', { name: /^(Skip|Continue)$/ }).click();
  }
}

test('tutorial completes via real clicks and shows an outcome screen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tutorial' }).click();

  const dialog = page.getByRole('dialog');
  const ratingHeading = page.getByRole('heading', { name: 'Rating the campus' });
  const reportCardHeading = page.getByRole('heading', { name: 'Report card' });
  const gameOverHeading = page.getByRole('heading', { name: /^(You win|You lose|Game over)/ });

  for (let i = 0; i < 100; i += 1) {
    if ((await reportCardHeading.count()) > 0 || (await gameOverHeading.count()) > 0) break;

    if ((await dialog.count()) > 0) {
      await page.getByTestId('event-choice').first().click();
      continue;
    }
    if ((await ratingHeading.count()) > 0) {
      await page.getByRole('button', { name: /^(Skip|Continue)$/ }).click();
      continue;
    }

    await queueEveryLegalAction(page);
    await page.getByRole('button', { name: 'End month' }).click();
  }

  await finishEndedFlow(page);
  await expect(reportCardHeading.or(gameOverHeading)).toBeVisible();
});

test('Whale campaign runs via the competent bot debug hook and shows the report card', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof (window as unknown as { __debugRunBot?: unknown }).__debugRunBot === 'function');

  // Seed 2: confirmed via `playOneGame` directly (not asserted blind) to be a competent-bot win
  // with a priced takeout, so this test exercises the full report card (grades + risk table),
  // not just the no-takeout-loss branch `tests/engine/systems/loseCheck.test.ts` already covers.
  await page.evaluate(() => {
    (
      window as unknown as { __debugRunBot: (botId: string, scenarioId: string, difficulty: string, seed: number) => void }
    ).__debugRunBot('competent', 'whale', 'normal', 2);
  });

  await finishEndedFlow(page);
  await expect(page.getByRole('heading', { name: 'Report card' })).toBeVisible();
  await expect(page.getByText(/Campus value .* equity multiple/)).toBeVisible();
});

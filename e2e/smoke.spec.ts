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
 * start, without this test needing to know the tutorial's own power/permit prerequisites.
 *
 * Bug fix (found diagnosing test 1's 30s/60s timeout via the error-context snapshot, which showed
 * dozens of duplicate "Stand down a hall: H1" plan entries): a 0-AP action like "Stand down" stays
 * `:enabled` forever since queuing it never costs anything that would disable it, so the old
 * `guard < 20` loop just re-clicked the SAME action up to 20 times per tab per month for no
 * benefit - 120 wasted real click round-trips a month. Track already-queued action names (reset
 * per tab per month, since the action row's accessible name is unique within a tab) and skip
 * re-clicking one already queued this visit. */
async function queueEveryLegalAction(page: Page) {
  for (const tabName of TAB_NAMES) {
    // Bug fix (found diagnosing test 1's real timeout - it got stuck waiting for the 'Chips' tab
    // button mid-loop): App.tsx renders `EndedFlow` off `draft.phase`, not the committed `state`'s
    // (store.ts's `queueAction` sets `draft: foldPlan(state, c, newPlan)` as a live plan preview) -
    // so merely *queuing* `priceTakeout` in an earlier tab (before "End month" is ever clicked)
    // immediately swaps the whole TracksPanel out for RatingScene. Bail out of any remaining tabs
    // once that's happened instead of clicking tab buttons that no longer exist.
    if ((await page.getByRole('heading', { name: 'Rating the campus' }).count()) > 0) return;
    await page.getByRole('button', { name: tabName, exact: true }).click();
    const queuedNames = new Set<string>();
    for (let guard = 0; guard < 20; guard += 1) {
      const buttons = page.getByTestId('action-row-button').and(page.locator(':enabled'));
      const count = await buttons.count();
      let clicked = false;
      for (let i = 0; i < count; i += 1) {
        const button = buttons.nth(i);
        const name = await button.innerText();
        // Bug fix (found diagnosing test 1's real timeout, not just a budget issue: the hall sat
        // "Not started / Paused" from Y1 M1 through Y2 M9 while cash drained): "Stand down" is
        // always 0 AP and always legal, so the generic "queue everything" strategy queued it in the
        // same month as "Advance construction" every single month, and a queued stand-down overrides
        // advancing that hall - the hall could never progress. Stand-down is never required to reach
        // an ending, so skip it entirely rather than letting it fight advanceHall for the whole run.
        if (queuedNames.has(name) || name.startsWith('Stand down')) continue;
        queuedNames.add(name);
        await button.click();
        clicked = true;
        break;
      }
      if (!clicked) break;
    }
  }
}

/** Clicks through the rating scene's Skip -> Continue (or straight to the report card if a
 * no-takeout loss skipped the rating scene entirely - see App.tsx's `EndedFlow`) until an outcome
 * heading appears. */
async function finishEndedFlow(page: Page) {
  const reportCardHeading = page.getByRole('heading', { name: 'Report card' });
  const gameOverHeading = page.getByRole('heading', { name: /^(You win|You lose|You scraped by|Game over)/ });
  for (let i = 0; i < 5; i += 1) {
    if ((await reportCardHeading.count()) > 0 || (await gameOverHeading.count()) > 0) return;
    await page.getByRole('button', { name: /^(Skip|Continue)$/ }).click();
  }
}

test('tutorial completes via real clicks and shows an outcome screen', async ({ page }) => {
  // Driving up to 20 real in-game months through real clicks (not the debug hook) is inherently
  // slower than Playwright's 30s default - the queueing-dedup fix above cut most of the waste, but
  // give it real headroom rather than a tight budget.
  test.setTimeout(300_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Tutorial' }).click();

  const dialog = page.getByRole('dialog');
  const ratingHeading = page.getByRole('heading', { name: 'Rating the campus' });
  const reportCardHeading = page.getByRole('heading', { name: 'Report card' });
  const gameOverHeading = page.getByRole('heading', { name: /^(You win|You lose|You scraped by|Game over)/ });

  // Bug fix (found diagnosing test 1's remaining timeout): event-dialog iterations don't advance
  // the month, and the tutorial scenario runs up to 20 months with frequent scripted events, so a
  // cap of 100 iterations ran out mid-dialog well before the game ended (observed stuck at Y2 M9).
  // Wall-clock time is already bounded by this test's own `test.setTimeout`, so a generous iteration
  // cap just gives the loop enough headroom to actually reach an ended state.
  for (let i = 0; i < 500; i += 1) {
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
    // Bug fix: queueing `priceTakeout` inside `queueEveryLegalAction` can itself already swap the
    // screen to RatingScene (see that function's comment) - "End month" won't exist in that case,
    // so skip the click and let next iteration's `ratingHeading` check above handle it.
    if ((await ratingHeading.count()) > 0) continue;
    await page.getByRole('button', { name: 'End month' }).click();
  }

  await finishEndedFlow(page);
  // Bug fix: the full report card screen shows BOTH an outcome heading ("You lose: ...") and its
  // own "Report card" section heading at once (e.g. the `equityWiped` lose reason still prices a
  // takeout), so `.or()` legitimately matches 2 elements - `.first()` just confirms one is shown.
  await expect(reportCardHeading.or(gameOverHeading).first()).toBeVisible();
});

test('Whale campaign runs via the competent bot debug hook and shows the report card', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof (window as unknown as { __debugRunBot?: unknown }).__debugRunBot === 'function');

  // Seed 3: confirmed via `playOneGame` directly (not asserted blind) to be a competent-bot win
  // with a priced takeout (2.03x under Phase 4's quarry-ridge site pick; seed 2 became a loss
  // when bots started choosing their ground), so this test exercises the full report card
  // (grades + risk table), not just the no-takeout-loss branch
  // `tests/engine/systems/loseCheck.test.ts` already covers.
  await page.evaluate(() => {
    (
      window as unknown as { __debugRunBot: (botId: string, scenarioId: string, difficulty: string, seed: number) => void }
    ).__debugRunBot('competent', 'whale', 'normal', 3);
  });

  await finishEndedFlow(page);
  await expect(page.getByRole('heading', { name: 'Report card' })).toBeVisible();
  await expect(page.getByText(/Campus value .* equity multiple/)).toBeVisible();
});

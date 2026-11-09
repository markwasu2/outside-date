import { expect, test, type Page } from '@playwright/test';

/**
 * playtest-fixes branch: Playwright coverage for the two findings that are genuinely about
 * on-screen behavior under real clicks (modal-vs-dispatch races, and a long fast-forward run)
 * rather than pure logic already covered by tests/ui/*.test.ts. Follows ui-qa-fixes.spec.ts's
 * and qa-fixes-2.spec.ts's convention of not touching smoke.spec.ts.
 */

/** Clicks "New game" through all 5 wizard screens with whatever defaults are pre-selected
 * (DEFAULT_SETUP/DEFAULT_NEGOTIATION, src/ui/defaultGame.ts) and starts the whale campaign -
 * the first scenario in content.scenarios (src/content/load.ts), and TitleScreen's default. */
async function startWhaleCampaign(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('button', { name: 'Next: Lease' }).click();
  await page.getByRole('button', { name: 'Next: Capital stack' }).click();
  await page.getByRole('button', { name: 'Next: Power' }).click();
  await page.getByRole('button', { name: 'Next: Insurance' }).click();
  await page.getByRole('button', { name: 'Start campaign' }).click();
}

test('fix 12: End month and Fast forward are disabled while an event modal is pending', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tutorial' }).click();

  // governor_visit is scripted to fire at month index 3 (content/events.json), same timing
  // ui-qa-fixes.spec.ts's finding #2 relies on - step.ts's drawEvent runs on the CURRENT month
  // before it increments, so the 4th "End month" click is the one that draws the card.
  const dialog = page.getByRole('dialog');
  for (let i = 0; i < 4 && (await dialog.count()) === 0; i += 1) {
    await page.getByRole('button', { name: 'End month' }).click();
  }
  await expect(dialog).toBeVisible();

  await expect(page.getByRole('button', { name: 'End month' })).toBeDisabled();
  await expect(page.getByTestId('fast-forward-button')).toBeDisabled();

  // Resolving the event re-enables both, confirming the guard is tied to the pending state,
  // not a one-way lockout.
  await page.getByTestId('event-choice').first().click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'End month' })).toBeEnabled();
  await expect(page.getByTestId('fast-forward-button')).toBeEnabled();
});

test('fix 14: fast-forwarding a whale campaign through Y3 never freezes silently', async ({ page }) => {
  // A real multi-year campaign driven by real clicks is inherently slow; give it real headroom.
  test.setTimeout(300_000);
  await startWhaleCampaign(page);

  const dialog = page.getByRole('dialog');
  const endMonthButton = page.getByRole('button', { name: 'End month' });
  const ffButton = page.getByTestId('fast-forward-button');
  const stopReason = page.getByText(/Fast-forward stopped/);
  const monthLabel = page.locator('strong').first();
  const gameOverHeading = page.getByRole('heading', { name: /^(You win|You lose|Game over)/ });
  const reportCardHeading = page.getByRole('heading', { name: 'Report card' });

  function yearOf(text: string | null): number {
    return text ? Number(text.match(/Y(\d+)/)?.[1] ?? 0) : 0;
  }

  // Drive forward with Fast forward as the default move - every time it legitimately stops short
  // (a due ledger entry, thin runway, or thin DSCR headroom - engine/step.ts's own guard order,
  // mirrored by store.ts's fastForwardStopReason), the UI must show a specific reason rather than
  // nothing, and "End month" must always clear it and advance exactly one month. A silent freeze
  // (no reason shown, month never changes, End month doesn't help) is exactly what this guards
  // against - it's what the original bug report looked like from the player's side.
  let reachedY3 = false;
  for (let i = 0; i < 300 && !reachedY3; i += 1) {
    if ((await gameOverHeading.count()) > 0 || (await reportCardHeading.count()) > 0) break;

    if ((await dialog.count()) > 0) {
      await page.getByTestId('event-choice').first().click();
      continue;
    }

    if ((await stopReason.count()) > 0) {
      // Short, catchable timeout rather than the default: a scripted event can flip the phase to
      // `awaitingChoice` (disabling this button) in the gap between the check above and this
      // click - without a bounded timeout the click's own actionability wait would block the loop
      // forever instead of looping back around to the dialog branch above.
      await endMonthButton.click({ timeout: 3000 }).catch(() => undefined);
      continue;
    }

    await ffButton.click({ timeout: 3000 }).catch(() => undefined);
    if (yearOf(await monthLabel.textContent()) >= 3) reachedY3 = true;
  }

  expect(reachedY3 || (await gameOverHeading.count()) > 0 || (await reportCardHeading.count()) > 0).toBe(true);
});

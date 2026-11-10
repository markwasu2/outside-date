import { filterActions, openActions, openStatus } from './campusNavigation';
import { expect, test, type Page } from '@playwright/test';

/**
 * qa-fixes-2 branch: Playwright coverage for the second QA pass's on-screen findings. Pure
 * assertions only - screenshots for the PR are taken by a separate throwaway script, not
 * committed here. Follows ui-qa-fixes.spec.ts's convention of not touching smoke.spec.ts.
 */

/** Clicks into the tutorial and opens the Land tab. */
async function startTutorialOnLandTab(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tutorial' }).click();
  await openActions(page);
  await filterActions(page, 'Land');
}

test('finding #1: the tutorial fundExtensions trap is disabled with a runway reason', async ({ page }) => {
  await startTutorialOnLandTab(page);

  // Phase 4: the tutorial's edge5-campus site pays a $1M grant at close, and at $9M the
  // extensions clear the runway check. Pin cash back to the pre-grant $8M (same pin as
  // tests/ui/checkAction.test.ts) so this finding's trap is exercised, not the grant.
  await page.evaluate(() => {
    (window as unknown as { __debugSetCash: (cash: number) => void }).__debugSetCash(8_000_000);
  });

  const fundRow = page.getByTestId('action-row-button').filter({ hasText: 'Fund road and school extensions' });
  await expect(fundRow).toBeDisabled();
  await expect(fundRow).toContainText('runway');

  // The affordable setup actions stay enabled on the same tab.
  await expect(page.getByTestId('action-row-button').filter({ hasText: 'Option the site' })).toBeEnabled();
});

test('finding #6: tutorial action rows show scenario-resolved costs, not whale prices', async ({ page }) => {
  await startTutorialOnLandTab(page);

  // The site option is funded by the tutorial's capital stack, so its cash cost reads $0
  // (was "$50.0M" - the whale's megasite land price against an $8.0M bankroll).
  await expect(page.getByTestId('action-row-button').filter({ hasText: 'Option the site' })).toContainText('$0');

  await openActions(page);
  await filterActions(page, 'Power');
  // tutorial-edge5's power overrides: $500K study / $500K switchgear deposit (were $2.0M/$3.0M).
  await expect(page.getByTestId('action-row-button').filter({ hasText: 'Commission the interconnection study' })).toContainText('$500K');
  await expect(page.getByTestId('action-row-button').filter({ hasText: 'Order the switchgear' })).toContainText('$500K');
});

test('finding #3: the scripted storm shows a HUD draw-freeze indicator and a log line', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tutorial' }).click();

  // Month 0: option the site and file the building permit so H1 is mid-stage when the scripted
  // month-7 storm lands (stormDamage only hits a hall active in pad/steel/shell).
  await openActions(page);
  await filterActions(page, 'Land');
  await page.getByTestId('action-row-button').filter({ hasText: 'Option the site' }).click();
  await openActions(page);
  await filterActions(page, 'Regulation');
  await page.getByTestId('action-row-button').filter({ hasText: 'File building permit' }).click();
  await page.getByRole('button', { name: 'End month' }).click();

  const dialog = page.getByRole('dialog');
  const indicator = page.getByTestId('draw-freeze-indicator');
  // End months until the storm lands, answering the scripted month-3 governor visit and
  // re-advancing H1 whenever a stage is free to start (pad from month 1, steel once the
  // building permit is granted around month 3-4).
  for (let i = 0; i < 12; i += 1) {
    if ((await indicator.count()) > 0) break;
    if ((await dialog.count()) > 0) {
      await page.getByTestId('event-choice').first().click();
      continue;
    }
    await openActions(page);
    await filterActions(page, 'Construction');
    const advance = page.getByTestId('action-row-button').filter({ hasText: 'Advance construction: H1' });
    if ((await advance.count()) > 0 && (await advance.isEnabled())) await advance.click();
    await page.getByRole('button', { name: 'End month' }).click();
  }

  await openStatus(page);
  await expect(indicator).toBeVisible();
  await expect(indicator).toContainText('Draw freeze');
  // The engine log line for the freeze start is visible in the log strip.
  await expect(page.getByText(/Lender draw freeze: construction draws are paused/).first()).toBeVisible();
});

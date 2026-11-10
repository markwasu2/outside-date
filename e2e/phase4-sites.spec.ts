import { filterActions, openActions } from './campusNavigation';
import { expect, test, type Page } from '@playwright/test';

/** Phase 4 (pillar A): the setup step offers three site cards per scenario, picking one
 * re-themes the card's map preview and the in-game map, and the forecast estimate moves
 * with the site's land cost. */

async function openSetup(page: Page, scenarioId: string) {
  await page.goto('/');
  await page.locator('select').first().selectOption(scenarioId);
  await page.getByRole('button', { name: 'New game' }).click();
}

async function forecastEstimate(page: Page, siteId: string) {
  await openSetup(page, 'whale');
  await page.getByTestId(`site-card-${siteId}`).click();
  for (const name of ['Next: Hall tier','Next: Cooling','Next: Contractor']) await page.getByRole('button',{name,exact:true}).click();
  await page.getByRole('button', { name: 'Next: Lease' }).click();
  await page.getByRole('button', { name: 'Next: Forecast' }).click();
  const text = await page.getByText(/Our estimate is /).textContent();
  return text ?? '';
}

test('whale setup step shows three site cards with map previews', async ({ page }) => {
  await openSetup(page, 'whale');
  await expect(page.getByTestId('site-card-megasite')).toBeVisible();
  await expect(page.getByTestId('site-card-farmland')).toBeVisible();
  await expect(page.getByTestId('site-card-quarry-ridge')).toBeVisible();
  await expect(page.getByTestId('site-preview-road')).toHaveCount(3);
});

test('each site pick re-themes its map preview (pond, ground, poles)', async ({ page }) => {
  await openSetup(page, 'whale');
  const farmland = page.getByTestId('site-card-farmland');
  await expect(farmland.getByTestId('site-preview-pond')).toHaveAttribute('data-pond', 'true');
  const megasite = page.getByTestId('site-card-megasite');
  await expect(megasite.getByTestId('site-preview-pond')).toHaveAttribute('data-pond', 'false');
  // Quarry ridge is the pole-line site: its preview road carries poles, the megasite's none.
  await expect(page.getByTestId('site-card-quarry-ridge').getByTestId('site-preview-road')).toContainText('🗼');
  await expect(megasite.getByTestId('site-preview-road')).not.toContainText('🗼');
});

test('the forecast estimate moves with the picked site', async ({ page }) => {
  const mega = await forecastEstimate(page, 'megasite');
  const farm = await forecastEstimate(page, 'farmland');
  const quarry = await forecastEstimate(page, 'quarry-ridge');
  expect(mega).not.toBe(farm);
  expect(farm).not.toBe(quarry);
  expect(mega).not.toBe(quarry);
});

test('the in-game map reads the picked site theme', async ({ page }) => {
  await openSetup(page, 'whale');
  await page.getByTestId('site-card-farmland').click();
  for (const name of ['Next: Hall tier','Next: Cooling','Next: Contractor']) await page.getByRole('button',{name,exact:true}).click();
  await page.getByRole('button', { name: 'Next: Lease' }).click();
  await page.getByRole('button', { name: 'Next: Forecast' }).click();
  await page.getByRole('button', { name: 'Next: Capital stack' }).click();
  await page.getByRole('button', { name: 'Next: Power' }).click();
  await page.getByRole('button', { name: 'Next: Insurance' }).click();
  await page.getByRole('button',{name:'Review closing table',exact:true}).click();
  await page.getByRole('button', { name: 'Start campaign' }).click();
  await expect(page.getByTestId('map-root')).toBeVisible();
  await expect(page.getByTestId('map-pond-slot')).toHaveAttribute('data-pond', 'true');
  const ground = await page.getByTestId('map-root').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(ground).not.toBe('rgb(215, 204, 200)'); // not the megasite ground
});

const TAB_NAMES = ['Land', 'Regulation', 'Power', 'Money', 'Chips', 'Construction'];

/** Same "queue every legal action" driver as e2e/smoke.spec.ts's tutorial test (duplicated per
 * repo convention: specs stay self-contained). Skips "Stand down" so it never fights
 * advanceHall, and bails once the rating scene swaps the tracks panel out. */
async function queueEveryLegalAction(page: Page) {
  for (const tabName of TAB_NAMES) {
    if ((await page.getByRole('heading', { name: 'Rating the campus' }).count()) > 0) return;
    await openActions(page);
    await filterActions(page, tabName);
    const queuedNames = new Set<string>();
    for (let guard = 0; guard < 20; guard += 1) {
      const buttons = page.getByTestId('action-row-button').and(page.locator(':enabled'));
      const count = await buttons.count();
      let clicked = false;
      for (let i = 0; i < count; i += 1) {
        const button = buttons.nth(i);
        const name = await button.innerText();
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

test('a full tutorial-scenario run on a non-default site completes to an outcome screen', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('/');
  await page.locator('select').first().selectOption('tutorial-edge5');
  await page.getByRole('button', { name: 'New game' }).click();
  // The wizard's default here is edge5-campus (it carries `replaces: megasite`); pick the
  // wetlands meadow instead so the whole run - pond theme, extra pad months, grant - is
  // exercised end to end, not just the card.
  await page.getByTestId('site-card-edge5-meadow').click();
  for (const name of ['Next: Hall tier','Next: Cooling','Next: Contractor']) await page.getByRole('button',{name,exact:true}).click();
  await page.getByRole('button', { name: 'Next: Lease' }).click();
  await page.getByRole('button', { name: 'Next: Forecast' }).click();
  await page.getByRole('button', { name: 'Next: Capital stack' }).click();
  await page.getByRole('button', { name: 'Next: Power' }).click();
  await page.getByRole('button', { name: 'Next: Insurance' }).click();
  await page.getByRole('button',{name:'Review closing table',exact:true}).click();
  await page.getByRole('button', { name: 'Start campaign' }).click();

  await expect(page.getByTestId('map-root')).toBeVisible();
  await expect(page.getByTestId('map-pond-slot')).toHaveAttribute('data-pond', 'true');

  const dialog = page.getByRole('dialog');
  const ratingHeading = page.getByRole('heading', { name: 'Rating the campus' });
  const reportCardHeading = page.getByRole('heading', { name: 'Report card' });
  const gameOverHeading = page.getByRole('heading', { name: /^(You win|You lose|You scraped by|Game over)/ });

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
    if ((await ratingHeading.count()) > 0) continue;
    await page.getByRole('button', { name: 'End month' }).click();
  }

  for (let i = 0; i < 5; i += 1) {
    if ((await reportCardHeading.count()) > 0 || (await gameOverHeading.count()) > 0) break;
    await page.getByRole('button', { name: /^(Skip|Continue)$/ }).click();
  }
  await expect(reportCardHeading.or(gameOverHeading).first()).toBeVisible();
});

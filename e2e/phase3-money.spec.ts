import { openStatus } from './campusNavigation';
import { expect, test } from '@playwright/test';

async function startWhaleToForecast(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.locator('select').first().selectOption('whale');
  await page.getByRole('button', { name: 'New game' }).click();
  for (const name of ['Next: Hall tier','Next: Cooling','Next: Contractor']) await page.getByRole('button',{name,exact:true}).click();
  await page.getByRole('button', { name: 'Next: Lease' }).click();
  await page.getByRole('button', { name: 'Next: Forecast' }).click();
}

test('wizard: the forecast step lets you call cost, contingency and month', async ({ page }) => {
  await startWhaleToForecast(page);
  await expect(page.getByTestId('forecast-step')).toBeVisible();
  await page.getByTestId('forecast-contingency').filter({ hasText: '15%' }).click();
  await expect(page.getByText(/The loan is sized on/)).toBeVisible();
  await page.getByRole('button', { name: 'Next: Capital stack' }).click();
  await page.getByRole('button', { name: 'Next: Power' }).click();
  await page.getByRole('button', { name: 'Next: Insurance' }).click();
  await page.getByRole('button',{name:'Review closing table',exact:true}).click();
  await page.getByRole('button', { name: 'Start campaign' }).click();
  await openStatus(page);
  await expect(page.getByTestId('hud-forecast')).toContainText('Call:');
});

test('runway warning deep-links to the Capital tab, where a lever can be queued', async ({ page }) => {
  await startWhaleToForecast(page);
  await page.getByRole('button', { name: 'Next: Capital stack' }).click();
  await page.getByRole('button', { name: 'Next: Power' }).click();
  await page.getByRole('button', { name: 'Next: Insurance' }).click();
  await page.getByRole('button',{name:'Review closing table',exact:true}).click();
  await page.getByRole('button', { name: 'Start campaign' }).click();
  await page.waitForFunction(() => typeof (window as unknown as { __debugSetCash?: unknown }).__debugSetCash === 'function');
  await page.evaluate(() => (window as unknown as { __debugSetCash: (n: number) => void }).__debugSetCash(9_000_000));
  await openStatus(page);
  await page.getByRole('button', { name: /Raise capital/ }).first().click();
  await expect(page.getByTestId('capital-summary')).toBeVisible();
  await page.getByRole('button', { name: /sponsor bridge loan/i }).first().click();
  await expect(page.getByTestId('undo-last-action')).toContainText(/bridge loan/i);
});

test('event card shows what the policy paid and the deductible', async ({ page }) => {
  await startWhaleToForecast(page);
  await page.getByRole('button', { name: 'Next: Capital stack' }).click();
  await page.getByRole('button', { name: 'Next: Power' }).click();
  await page.getByRole('button', { name: 'Next: Insurance' }).click();
  await page.getByRole('button',{name:'Review closing table',exact:true}).click();
  await page.getByRole('button', { name: 'Start campaign' }).click();
  await page.waitForFunction(() => typeof (window as unknown as { __debugLoss?: unknown }).__debugLoss === 'function');
  await page.evaluate(() => (window as unknown as { __debugLoss: (k: string) => void }).__debugLoss('storm'));
  const claim = page.getByTestId('claim-breakdown');
  await expect(claim).toContainText('Policy paid');
  await expect(claim).toContainText('Deductible you paid');
});

// UX 12: the DSU choice shows its stakes in setup - an OFF warning box with the uninsured
// example (LDs, abated rent, outside date), flipping to the ON box when the checkbox is ticked.
test('wizard: the insurance screen shows what DSU off costs', async ({ page }) => {
  await startWhaleToForecast(page);
  await page.getByRole('button', { name: 'Next: Capital stack' }).click();
  await page.getByRole('button', { name: 'Next: Power' }).click();
  await page.getByRole('button', { name: 'Next: Insurance' }).click();
  const off = page.getByTestId('dsu-stakes-off');
  await expect(off).toBeVisible();
  await expect(off).toContainText('liquidated damages');
  await expect(off).toContainText('outside date');
  await page.getByTestId('dsu-toggle').check();
  await expect(page.getByTestId('dsu-stakes-on')).toBeVisible();
  await expect(page.getByTestId('dsu-stakes-off')).toHaveCount(0);
});

test('power hints agree with the slip odds shown on setup buttons', async ({ page }) => {
  await startWhaleToForecast(page);
  await page.getByRole('button', { name: 'Next: Capital stack' }).click();
  await page.getByRole('button', { name: 'Next: Power' }).click();
  await expect(page.getByRole('button', { name: /Low .*55%/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Medium .*45%/ })).toBeVisible();
  await expect(page.getByText('Lower slip odds than Low, and each slip runs a month shorter.')).toBeVisible();
  await expect(page.getByText(/Same slip odds as Low/)).toHaveCount(0);
  await page.screenshot({ path: 'docs/screenshots/cold2/power-hints.png' });
});

test('a threshold warning appears in the banner without a duplicate notice card', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('quick-start').click();
  await page.evaluate(async () => {
    const { useStore } = await import('/src/ui/store.ts');
    const { warnings } = await import('/src/ui/board/warnings.ts');
    const s = useStore.getState();
    const low = { ...s.state, cash: 1_000_000 };
    const crossings = warnings(low, s.content).map((w) => ({ month: low.month, kind: 'warning', text: w.title, detail: w.detail }));
    const next = { ...low, log: [...low.log, ...crossings] };
    useStore.setState({ state: next, draft: next });
  });
  await openStatus(page);
  await expect(page.getByTestId('warning-banner')).toContainText('Runway under 3 months');
  await expect(page.getByTestId('event-notice')).toHaveCount(0);
  await page.screenshot({ path: 'docs/screenshots/cold2/banner-dedupe.png' });
});

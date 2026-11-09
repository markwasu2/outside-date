import { expect, test } from '@playwright/test';

async function startWhaleToForecast(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.locator('select').first().selectOption('whale');
  await page.getByRole('button', { name: 'New game' }).click();
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
  await page.getByRole('button', { name: 'Start campaign' }).click();
  await expect(page.getByTestId('hud-forecast')).toContainText('Call:');
});

test('runway warning deep-links to the Capital tab, where a lever can be queued', async ({ page }) => {
  await startWhaleToForecast(page);
  await page.getByRole('button', { name: 'Next: Capital stack' }).click();
  await page.getByRole('button', { name: 'Next: Power' }).click();
  await page.getByRole('button', { name: 'Next: Insurance' }).click();
  await page.getByRole('button', { name: 'Start campaign' }).click();
  await page.waitForFunction(() => typeof (window as unknown as { __debugSetCash?: unknown }).__debugSetCash === 'function');
  await page.evaluate(() => (window as unknown as { __debugSetCash: (n: number) => void }).__debugSetCash(9_000_000));
  await page.getByRole('button', { name: /Raise capital/ }).first().click();
  await expect(page.getByTestId('capital-summary')).toBeVisible();
  await page.getByRole('button', { name: /sponsor bridge loan/i }).first().click();
  await expect(page.getByTestId('queued-pending-tag')).toBeVisible();
});

test('event card shows what the policy paid and the deductible', async ({ page }) => {
  await startWhaleToForecast(page);
  await page.getByRole('button', { name: 'Next: Capital stack' }).click();
  await page.getByRole('button', { name: 'Next: Power' }).click();
  await page.getByRole('button', { name: 'Next: Insurance' }).click();
  await page.getByRole('button', { name: 'Start campaign' }).click();
  await page.waitForFunction(() => typeof (window as unknown as { __debugLoss?: unknown }).__debugLoss === 'function');
  await page.evaluate(() => (window as unknown as { __debugLoss: (k: string) => void }).__debugLoss('storm'));
  const claim = page.getByTestId('claim-breakdown');
  await expect(claim).toContainText('Policy paid');
  await expect(claim).toContainText('Deductible you paid');
});

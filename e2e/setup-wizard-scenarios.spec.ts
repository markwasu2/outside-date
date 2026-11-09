import { expect, test } from '@playwright/test';

async function openScenario(page: import('@playwright/test').Page, scenarioId: string) {
  await page.goto('/');
  await page.locator('select').first().selectOption(scenarioId);
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('button', { name: 'Next: Lease' }).click();
}

test('Millbrook Relay wizard shows pinned lease and mezz terms plus resolved estimates', async ({ page }) => {
  await openScenario(page, 'millbrook-relay');

  await expect(page.getByRole('button', { name: /Y3 M7/ })).toBeDisabled();
  await expect(page.getByText('Delivery is fixed by this scenario at Y3 M7.')).toBeVisible();
  await expect(page.getByText('The late remedy is fixed by this scenario as liquidated damages.')).toBeVisible();
  // UX 2: "outside date" now carries its first-use inline gloss before the pinned-months text.
  await expect(page.getByText(/outside date \(the deadline before the tenant can walk\), 4 months after/)).toBeVisible();

  await page.getByRole('button', { name: 'Next: Forecast' }).click();

  await page.getByRole('button', { name: 'Next: Capital stack' }).click();
  await expect(page.getByRole('button', { name: 'None' })).toBeDisabled();
  await expect(page.getByText('Fixed by this scenario.')).toBeVisible();

  await page.getByRole('button', { name: 'Next: Power' }).click();
  await expect(page.getByText(/Plant A \(Y3 M5\)/)).toBeVisible();
  await expect(page.getByText(/H1 needs \(Y3 M7\)/)).toBeVisible();

  await page.getByRole('button', { name: 'Next: Insurance' }).click();
  await expect(page.getByText(/\$200K\/month/)).toBeVisible();
  await expect(page.getByText(/\$300K\/month/)).toBeVisible();
});

test('Whale wizard keeps its lease and mezz choices open and shows base estimates', async ({ page }) => {
  await openScenario(page, 'whale');

  await expect(page.getByRole('button', { name: /Y3 M11/ })).toBeEnabled();
  await expect(page.getByRole('button', { name: /Y4 M3/ })).toBeEnabled();
  await expect(page.getByRole('button', { name: /Y4 M7/ })).toBeEnabled();
  await expect(page.getByText(/Delivery is fixed by this scenario/)).toHaveCount(0);

  await page.getByRole('button', { name: 'Next: Forecast' }).click();

  await page.getByRole('button', { name: 'Next: Capital stack' }).click();
  await expect(page.getByRole('button', { name: 'None' })).toBeEnabled();
  await expect(page.getByRole('button', { name: /15% of budget @ 12% PIK/ })).toBeEnabled();
  await expect(page.getByRole('button', { name: /20% of budget @ 13% PIK/ })).toBeEnabled();

  await page.getByRole('button', { name: 'Next: Power' }).click();
  await expect(page.getByText(/Plant A \(Y4 M1\)/)).toBeVisible();
  await page.getByRole('button', { name: 'Next: Insurance' }).click();
  await expect(page.getByText(/\$600K\/month/)).toBeVisible();
  await expect(page.getByText(/\$1\.0M\/month/)).toBeVisible();
});

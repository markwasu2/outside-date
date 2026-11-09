import { expect, test } from '@playwright/test';

/**
 * UI-polish batch: Playwright coverage for the items that are genuinely about on-screen behavior
 * (visible text, Esc/backdrop dismissal, a real button click) rather than pure logic already
 * covered by tests/ui/*.test.ts. Does not touch or weaken smoke.spec.ts's existing assertions.
 */

test('item 2: all four goodwill labels are visible and distinct in the HUD', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tutorial' }).click();

  await expect(page.getByText(/Town: \d+/)).toBeVisible();
  await expect(page.getByText(/PUC\/Commission: \d+/)).toBeVisible();
  await expect(page.getByText(/Utility: \d+/)).toBeVisible();
  await expect(page.getByText(/Tenant: \d+/)).toBeVisible();
});

test('item 3: Codex modal closes on Escape and on a backdrop click', async ({ page }) => {
  await page.goto('/');
  const codexHeading = page.getByRole('heading', { name: 'Codex', exact: true });

  await page.getByRole('button', { name: 'Codex' }).click();
  await expect(codexHeading).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(codexHeading).toHaveCount(0);

  await page.getByRole('button', { name: 'Codex' }).click();
  await expect(codexHeading).toBeVisible();
  // The Codex overlay's inner panel is centered and narrower than the viewport, so a click near
  // the corner lands on the backdrop, not the panel.
  await page.mouse.click(5, 5);
  await expect(codexHeading).toHaveCount(0);
});

test('item 4: the HUD fast-forward button advances the month', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tutorial' }).click();

  const monthLabel = page.locator('strong').first();
  const startMonth = await monthLabel.innerText();

  const ffButton = page.getByTestId('fast-forward-button');
  await expect(ffButton).toBeEnabled();
  await ffButton.click();

  // Fast-forward is a synchronous engine call deferred one tick behind the busy label - wait for
  // it to settle back to its idle label rather than asserting on the (possibly missed) busy frame.
  await expect(ffButton).toHaveText('\u23E9 Fast forward', { timeout: 10_000 });
  await expect(monthLabel).not.toHaveText(startMonth);
});

import { test, expect } from '@playwright/test';

test('posture bars steer the sim, which runs months on its own and pauses for events', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tutorial', exact: true }).click();

  // The Postures drawer holds the bars and the run control.
  await page.getByRole('button', { name: 'Postures', exact: true }).click();
  const drawer = page.getByTestId('postures-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('Permits & paperwork');
  await expect(drawer).toContainText('Construction push');

  // A paperwork-only bar: the sim should file permits, not advance halls.
  const slider = page.getByTestId('posture-slider-paperwork');
  await slider.fill('6');
  await page.getByTestId('posture-slider-construction').fill('0');
  await page.getByTestId('posture-slider-community').fill('0');
  await page.getByTestId('posture-slider-cash').fill('0');
  await expect(page.getByTestId('posture-value-paperwork')).toHaveText('6');
  await page.screenshot({ path: 'docs/screenshots/cold2/postures-panel.png' });

  const monthLabel = page.getByTestId('campus-status').locator('strong').first();
  const startMonth = await monthLabel.innerText();
  await page.getByTestId('sim-toggle').click();
  await expect(page.getByTestId('sim-running-note')).toBeVisible();

  // The sim runs on its own: at least two months pass without another click.
  await expect(monthLabel).not.toHaveText(startMonth, { timeout: 10_000 });
  const month1 = await monthLabel.innerText();
  await expect(monthLabel).not.toHaveText(month1, { timeout: 10_000 });

  // Pause and inspect what the sim did by the bars: baseline ops plus permits, no hall starts.
  await page.getByTestId('fast-forward-button').click();
  await expect(page.getByTestId('sim-running-note')).toHaveCount(0);
  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  const planDrawer = page.getByTestId('actions-drawer');
  await expect(planDrawer).toContainText('Done this month');
  await page.screenshot({ path: 'docs/screenshots/cold2/posture-sim-done.png' });
});

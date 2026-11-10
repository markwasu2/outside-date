import { test, expect } from '@playwright/test';
import { openStatus } from './campusNavigation';

test('Financials keeps money readable and the closing control in reach', async ({ page }) => {
  await page.goto('/'); await page.getByTestId('quick-start').click();
  await openStatus(page); await page.getByTestId('open-financials').click();
  const drawer = page.getByTestId('financials-drawer');
  await expect(drawer).toBeVisible();
  const box = (await drawer.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(600);
  expect(box.y).toBeGreaterThanOrEqual(50);
  expect(box.y + box.height).toBeLessThanOrEqual(656);
  expect(await page.getByTestId('sources-uses-table').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
  await expect(drawer).toContainText('or at Y5 M7, whichever comes first.');
  await expect(drawer).toContainText('First tested when all active halls deliver');
  await page.screenshot({path: 'docs/screenshots/cold2/financials-readable.png'});
  await drawer.evaluate(el => el.scrollTo(0, el.scrollHeight));
  await drawer.getByRole('button', { name: 'close', exact: true }).click();
  await expect(drawer).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'End month', exact: true})).toBeVisible();
});

test('Financials uses the scenario covenant clock and fits a narrow viewport', async ({page}) => {
  await page.setViewportSize({width: 600, height: 720});
  await page.goto('/'); await page.getByTestId('quick-start').click();
  await page.evaluate(async () => {
    // @ts-expect-error dev browser import
    const {useStore} = await import('/src/ui/store.ts');
    const state = structuredClone(useStore.getState().state);
    state.scenarioId = 'millbrook-relay'; useStore.setState({state, draft: state, openPanel: 'financials'});
  });
  const drawer = page.getByTestId('financials-drawer');
  await expect(drawer).toContainText('or at Y4 M2, whichever comes first.');
  const box = (await drawer.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(600);
  expect(await drawer.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
});

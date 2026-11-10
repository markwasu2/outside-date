import { test, expect } from '@playwright/test';
test('a small investor loss does not read as break-even on the final report', async ({page}) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.__debugRunBot === 'function');
  await page.evaluate(async () => {
    window.__debugRunBot!('careful', 'millbrook-relay', 'normal', 1);
    // @ts-expect-error dev browser import
    const {useStore} = await import('/src/ui/store.ts');
    const state = structuredClone(useStore.getState().state);
    state.takeout.equityMultiple = 0.996;
    state.outcome = {kind: 'win', tier: 'scraped'};
    useStore.setState({state, draft: state});
  });
  await page.getByRole('button', {name: 'Continue', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'You scraped by'})).toBeVisible();
  await expect(page.getByText(/Campus value.*equity multiple just under 1.00x/)).toBeVisible();
  await expect(page.getByText(/at just under 1.00x investors got back less/)).toBeVisible();
  await page.screenshot({path: 'docs/screenshots/cold2/borderline-equity.png'});
});

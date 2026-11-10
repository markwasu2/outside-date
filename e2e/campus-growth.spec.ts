import { expect, test } from '@playwright/test';

test('campus halls rise from their completed stage and show stopped work on the object', async ({ page }) => {
  await page.goto('/'); await page.getByTestId('quick-start').click();
  await page.evaluate(async () => {
    // @ts-expect-error dev browser source import
    const {useStore} = await import('/src/ui/store.ts');
    const next = structuredClone(useStore.getState().state);
    next.halls.forEach((h: {stageIndex:number;stageActive:boolean;stageMonthsDone:number;delivered:boolean}, i:number) => {
      h.stageIndex = i === 0 ? 1 : i === 1 ? 2 : i === 2 ? 3 : 5;
      h.stageActive = i < 3; h.stageMonthsDone = i === 0 ? 1 : i === 1 ? 2 : 3; h.delivered = i === 3;
    });
    next.flags['inspectionFail:H3'] = true;
    useStore.setState({state:next,draft:next});
  });
  await expect(page.locator('[data-hall-id="H1"] [data-testid="hall-growth"]')).toHaveAttribute('data-progress', /0\./);
  await expect(page.getByTestId('caption-H3')).toContainText('Stopped - failed inspection');
  await expect(page.locator('[data-hall-id="H3"]')).toHaveAttribute('data-blocked','true');
  await expect(page.locator('[data-hall-id="H3"] [data-testid="stage-vehicle"]')).toHaveCount(0);
  await expect(page.getByTestId('caption-H4')).toHaveText('Delivered');
  await page.screenshot({path:'docs/screenshots/cold2/hall-growth.png'});
  await page.evaluate(async () => {
    // @ts-expect-error dev browser source import
    const {useStore} = await import('/src/ui/store.ts');
    const next = structuredClone(useStore.getState().state); next.flags.drawFreeze = true;
    useStore.setState({state:next,draft:next});
  });
  await expect(page.getByTestId('caption-H1')).toContainText('Paused - lender draw freeze');
});

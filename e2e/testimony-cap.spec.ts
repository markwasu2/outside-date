import {test,expect} from '@playwright/test';
test('capped testimony is contextual and explains wasted focus and consecutive preparation cost',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);s.docket.status='open';s.docket.testimonyBonus=.24;s.flags.lastPrepTestimonyMonth=s.month-1;useStore.setState({state:s,draft:s});
 });
 await page.getByRole('button',{name:'Site office',exact:true}).click();
 const fold=page.getByTestId('context-only-actions');const prep=fold.getByTestId('popover-action').filter({hasText:'Prepare testimony'});
 await expect(prep).not.toBeVisible();await fold.locator('summary').click();await expect(prep).toBeVisible();await expect(prep).toContainText('already at its 24% cap');await expect(prep).toContainText('adds no vote chance');await expect(prep).toContainText('commission goodwill -1');
 await prep.scrollIntoViewIfNeeded();await page.screenshot({path:'docs/screenshots/cold2/testimony-cap.png'});
});

import {test,expect} from '@playwright/test';
test('completed liquid readiness folds while unready halls retain their visible instruction',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);
 s.setup.hallTier='liquid';s.flags.siteOptioned=true;s.halls[0].stageIndex=3;s.halls[0].stageActive=true;s.halls[0].liquidReady=false;useStore.setState({state:s,draft:s});
 });
 await page.getByRole('button',{name:/^H1 Fit-out/}).click();const popup=page.getByTestId('map-popover');
 const ready=popup.getByTestId('popover-action').filter({hasText:'Ready liquid cooling: H1'});
 await expect(ready).toBeVisible();await expect(ready).toBeEnabled();await ready.click();
 await expect(ready).not.toBeVisible();await popup.getByTestId('context-only-actions').locator('summary').click();
 await expect(ready).toBeVisible();await expect(ready).toBeDisabled();await expect(ready).toContainText('already liquid-ready');
 await ready.scrollIntoViewIfNeeded();await page.screenshot({path:'docs/screenshots/cold2/completed-liquid-ready.png'});
 await expect(page.getByRole('button',{name:'End month',exact:true})).toBeEnabled();
});

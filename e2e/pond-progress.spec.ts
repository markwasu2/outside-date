import {test,expect} from '@playwright/test';
test('touching a previously seen pond retains its permit and mitigation clock',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);
 s.month=7;s.setup.site='farmland';s.permits.water.status='granted';s.halls[0].pondBlocked=true;s.permitsRequired.push('wetlands');s.permits.wetlands.status='pending';s.permits.wetlands.decisionMonth=9;
 useStore.setState({state:s,draft:s,seenBoardObjects:['pond']});
 });
 await page.locator('[data-campus-object="pond"]').click();const popup=page.getByTestId('map-popover');
 await expect(popup.getByTestId('pond-progress')).toContainText('Decision due Y1 M10');
 await expect(popup.getByTestId('popover-teaching')).toHaveCount(0);
 await page.screenshot({path:'docs/screenshots/cold2/pond-review-progress.png'});
 await popup.getByRole('button',{name:'Close',exact:true}).click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);s.permits.wetlands.status='granted';s.flags.pondMitigationDoneMonth=11;useStore.setState({state:s,draft:s});
 });
 await page.locator('[data-campus-object="pond"]').click();await expect(popup.getByTestId('pond-progress')).toContainText('underway until Y1 M12');
 await page.screenshot({path:'docs/screenshots/cold2/pond-mitigation-progress.png'});
});

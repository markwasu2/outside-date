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

test('pond touch offers mitigation itself and changes to the work clock after queueing',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);
 s.month=7;s.setup.site='farmland';s.halls[0].pondBlocked=true;s.permitsRequired.push('wetlands');s.permits.water.status='granted';s.permits.wetlands.status='pending';s.permits.wetlands.decisionMonth=9;
 useStore.setState({state:s,draft:s});
 });
 await page.locator('[data-campus-object="pond"]').click();const popup=page.getByTestId('map-popover');
 const mitigate=popup.getByTestId('popover-action').filter({hasText:'Mitigate the wetlands pond'});
 await expect(mitigate).toBeVisible();await expect(mitigate).toBeDisabled();await expect(mitigate).toContainText('needs the wetlands permit granted first');
 await popup.getByRole('button',{name:'Close',exact:true}).click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);s.permits.wetlands.status='granted';useStore.setState({state:s,draft:s});
 });
 await page.locator('[data-campus-object="pond"]').click();await expect(mitigate).toBeEnabled();await expect(popup.getByTestId('pond-progress')).toContainText('Mitigate the pond below');
 await page.screenshot({path:'docs/screenshots/cold2/pond-mitigation-action.png'});
 await mitigate.click();await expect(mitigate).toHaveCount(0);await expect(popup.getByTestId('pond-progress')).toContainText('mitigation is underway until');
 await expect(popup.getByRole('status')).toContainText('done');await expect(page.getByRole('button',{name:'End month',exact:true})).toBeEnabled();
});

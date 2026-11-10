import {test,expect} from '@playwright/test';
test('active hall explains labor pace, expiry and yard recovery only during shortage',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);s.month=48;s.flags.laborShortUntilMonth=51;s.flags.siteOptioned=true;s.halls[0].stageActive=true;s.halls[0].stageIndex=3;s.halls[0].stageMonthsDone=2;useStore.setState({state:s,draft:s});
 });
 await page.getByRole('button',{name:/^H1 Fit-out/}).click();const clock=page.getByTestId('hall-labor-clock');await expect(clock).toContainText('half normal');await expect(clock).toContainText('Y5 M4');await expect(clock).toContainText('laydown yard');await page.screenshot({path:'docs/screenshots/cold2/hall-labor-clock.png'});
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);s.flags.laborShortUntilMonth=s.month;useStore.setState({state:s,draft:s});
 });await expect(clock).toHaveCount(0);
});

import {test,expect} from '@playwright/test';
test('the permit blocker opens its live review date instead of an unexplained list of visits',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState();const s=structuredClone(store.state);s.month=3;s.flags.siteOptioned=true;Object.values(s.permits).forEach((p:{status:string})=>p.status='granted');s.permits.building.status='pending';s.permits.building.decisionMonth=5;s.power.studyStatus='done';s.power.substationStatus='done';s.halls[0].stageIndex=1;s.halls[0].stageActive=false;useStore.setState({state:s,draft:s});
 });
 await page.locator('[data-campus-object="siteOffice"]').click();const popup=page.getByTestId('map-popover');await expect(popup.getByTestId('permit-review')).toContainText('building permit: under review. Decision due Y1 M6');await expect(popup.getByTestId('permit-review')).toContainText('filing is not approval');await page.screenshot({path:'docs/screenshots/cold2/permit-review.png'});
});

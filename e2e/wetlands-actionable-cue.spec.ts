import {test,expect} from '@playwright/test';
test('pending wetlands review does not send the player to a disabled mitigation action',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState();const s=structuredClone(store.state);s.month=3;s.flags.siteOptioned=true;s.power.studyStatus='pending';s.power.orders=[{kind:'transformer',orderedMonth:0,arrivalMonth:24,deposit:0,price:0,arrived:false,supplier:'standard'},{kind:'switchgear',orderedMonth:0,arrivalMonth:17,deposit:0,price:0,arrived:false,supplier:'standard'}];Object.values(s.permits).forEach((p:{status:string})=>p.status='pending');s.permits.wetlands.decisionMonth=9;s.halls[0].pondBlocked=true;s.docket.status='open';s.docket.discoveryOutstanding=true;useStore.setState({state:s,draft:s});
 });
 await expect(page.getByTestId('next-step-card')).toContainText('Answer the discovery request');
 await page.getByTestId('next-step-show-me').click();const popup=page.getByTestId('map-popover');await expect(popup.getByRole('button',{name:/^Answer discovery/})).toBeEnabled();await page.screenshot({path:'docs/screenshots/cold2/wetlands-actionable-cue.png'});
});

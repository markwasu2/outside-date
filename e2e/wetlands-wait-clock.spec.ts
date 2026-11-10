import { adviceElement } from './campusNavigation';
import {test,expect} from '@playwright/test';
test('wetlands waits show the review or mitigation clock, not a disabled action',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState();const s=structuredClone(store.state);s.month=7;s.flags.siteOptioned=true;s.power.studyStatus='done';s.power.substationStatus='done';s.docket.status='approved';Object.values(s.permits).forEach((p:{status:string})=>p.status='granted');s.permits.wetlands.status='pending';s.permits.wetlands.decisionMonth=9;s.halls.forEach((h:{stageIndex:number;stageActive:boolean;energized:boolean})=>{h.stageIndex=2;h.stageActive=true;h.energized=true;});s.halls[0].stageActive=false;s.halls[0].pondBlocked=true;useStore.setState({state:s,draft:s});
 });
 const cue=(await adviceElement(page, 'next-step-card'));await expect(cue).toContainText('Check the wetlands review');await (await adviceElement(page, 'next-step-show-me')).click();const popup=page.getByTestId('map-popover');await expect(popup.getByTestId('permit-review')).toContainText('wetlands permit: under review. Decision due Y1 M10');await page.screenshot({path:'docs/screenshots/cold2/wetlands-review-clock.png'});await popup.getByRole('button',{name:'Close',exact:true}).click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);s.permits.wetlands.status='granted';s.flags.pondMitigationDoneMonth=11;useStore.setState({state:s,draft:s});
 });
 await expect(cue).toContainText('End the month');await (await adviceElement(page, 'next-step-show-me')).click();await expect(cue).toContainText('Wetlands mitigation is underway until Y1 M12');await expect(page.getByTestId('map-popover')).toHaveCount(0);await page.screenshot({path:'docs/screenshots/cold2/wetlands-mitigation-clock.png'});
});

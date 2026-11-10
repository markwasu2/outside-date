import {test,expect} from '@playwright/test';

test('closing wait tells the same delivered and terminated story as the campus',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState();const s=structuredClone(store.state);
 s.month=46;s.flags.siteOptioned=true;s.docket.status='approved';s.power.studyStatus='done';s.power.substationStatus='done';
 Object.values(s.permits).forEach((p:{status:string})=>p.status='granted');
 s.halls.forEach((h:{stageIndex:number;stageActive:boolean;energized:boolean;delivered:boolean;terminated:boolean},i:number)=>{h.stageIndex=i<3?5:3;h.stageActive=false;h.energized=i<3;h.delivered=i<3;h.terminated=i===3;});
 s.power.plants.forEach((p:{onlineMonth:number})=>p.onlineMonth=40);
 useStore.setState({state:s,draft:s});
 });
 const cue=page.getByTestId('next-step-card');
 await expect(cue).toContainText('Wait for the lender retest');await page.getByTestId('next-step-show-me').click();
 await expect(cue).toContainText('3 of 4 halls are delivered. 1 hall was terminated.');
 await expect(cue).not.toContainText('Every hall is delivered');
 await expect(page.getByRole('button',{name:/H4 Terminated/})).toBeVisible();
 await page.screenshot({path:'docs/screenshots/cold2/terminated-closing-cue.png'});
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);s.debt.converted=true;s.flags.conversionMonth=46;useStore.setState({state:s,draft:s});
 });
 await expect(cue).toContainText('Let the rent season before closing');
 await page.getByTestId('next-step-show-me').click();
 await expect(cue).toContainText('3 of 4 halls are delivered. 1 hall was terminated.');
});

import { adviceElement } from './campusNavigation';
import {test,expect} from '@playwright/test';
test('waiting explains the monthly clock without opening a disabled hall action',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState();const s=structuredClone(store.state);s.flags.siteOptioned=true;s.power.studyStatus='done';s.power.substationStatus='done';s.docket.status='approved';Object.values(s.permits).forEach((p:{status:string})=>p.status='granted');s.halls.forEach((h:{stageIndex:number;stageActive:boolean;energized:boolean})=>{h.stageIndex=2;h.stageActive=true;h.energized=true;});useStore.setState({state:s,draft:s});
 });
 const cue=(await adviceElement(page, 'next-step-card'));await expect(cue).toContainText('End the month');await cue.getByRole('button',{name:'Why wait?',exact:true}).click();await expect(cue).toContainText('Use End month below');await expect(page.getByTestId('map-popover')).toHaveCount(0);await page.screenshot({path:'docs/screenshots/cold2/wait-clock-cue.png'});
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState();const s=structuredClone(store.state);s.phase='takeoutAvailable';s.halls[0].delivered=true;useStore.setState({state:s,draft:s});
 });
 await expect(cue).toContainText('Close the campus as it stands');await cue.getByRole('button').first().click();await expect(cue).toContainText('3 of 4 halls remain undelivered');await expect(cue).toContainText('ends construction');await page.screenshot({path:'docs/screenshots/cold2/partial-cutoff-explanation.png'});await cue.getByRole('button',{name:'Show me',exact:true}).click();await expect(cue).not.toContainText('3 of 4 halls remain undelivered');await expect(page.getByTestId('map-popover').getByTestId('popover-action').filter({hasText:'Price the takeout'})).toBeEnabled();await page.screenshot({path:'docs/screenshots/cold2/partial-cutoff-cue.png'});
});

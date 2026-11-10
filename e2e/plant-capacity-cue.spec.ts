import { adviceElement } from './campusNavigation';
import {test,expect} from '@playwright/test';
test('a powered substation routes a waiting hall to the actual missing plant capacity',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState();const s=structuredClone(store.state);s.month=24;s.power.studyStatus='done';s.power.substationStatus='done';s.power.interimGridMW=12;s.docket.status='approved';s.flags.siteOptioned=true;Object.values(s.permits).forEach((p:{status:string})=>p.status='granted');s.halls.forEach((h:{stageIndex:number;stageActive:boolean;energized:boolean})=>{h.stageIndex=4;h.stageActive=false;h.energized=false;});s.power.plants.forEach((p:{plannedOnlineMonth:number;onlineMonth:null})=>{p.plannedOnlineMonth=29;p.onlineMonth=null;});useStore.setState({state:s,draft:s});
 });
 await expect((await adviceElement(page, 'next-step-card'))).toContainText('waiting for plant capacity');await (await adviceElement(page, 'next-step-show-me')).click();const popup=page.getByTestId('map-popover');await expect(popup).toHaveAttribute('aria-label','Power plants actions');await expect(popup.getByTestId('power-capacity')).toContainText('12.0 MW available');await expect(popup.getByTestId('power-capacity')).toContainText('Next scheduled capacity: Plant A, Y3 M6');await page.screenshot({path:'docs/screenshots/cold2/plant-capacity-cue.png'});
});

test('newly available capacity explains the next automatic hookup instead of asking for more MW',async({page})=>{
 await page.goto('/'); await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts'); const store=useStore.getState(); const s=structuredClone(store.state);
 s.month=50; s.power.studyStatus='done'; s.power.substationStatus='done'; s.power.interimGridMW=32;
 s.docket.status='approved'; s.flags.siteOptioned=true;
 Object.values(s.permits).forEach((p:{status:string})=>p.status='granted');
 s.halls.forEach((h:{stageIndex:number;stageActive:boolean;energized:boolean;delivered:boolean},i:number)=>{h.stageIndex=4;h.stageActive=false;h.energized=i<3;h.delivered=i<3;});
 s.power.plants.forEach((p:{plannedOnlineMonth:number;onlineMonth:number})=>{p.plannedOnlineMonth=50;p.onlineMonth=50;});
 useStore.setState({state:s,draft:s});
 });
 const cue=(await adviceElement(page, 'next-step-card'));
 await expect(cue).toContainText('H4: ready for automatic power hookup');
 await (await adviceElement(page, 'next-step-show-me')).click();
 await expect(cue).toContainText('End month runs its automatic power hookup');
 await expect(page.getByTestId('map-popover')).toHaveCount(0);
 await page.screenshot({path:'docs/screenshots/cold2/automatic-hookup-cue.png'});
 await page.getByRole('button',{name:'End month',exact:true}).click();
 await expect(cue).not.toContainText('waiting for plant capacity');
});

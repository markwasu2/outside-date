import { adviceElement } from './campusNavigation';
import {test,expect} from '@playwright/test';

test('final stage is commissioning work before delivery, with a matching map action',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState(),s=structuredClone(store.state);
 s.halls=s.halls.slice(0,1);const h=s.halls[0];
 h.stageIndex=4;h.stageActive=false;h.energized=true;h.liquidReady=true;
 s.flags.siteOptioned=1;s.flags.siteOptionedAtStart=1;
 for(const p of Object.values(s.permits) as {status:string}[])p.status='granted';
 s.power.studyStatus='done';s.power.substationStatus='done';s.docket.status='approved';
 s.power.plants.forEach((p:{status:string;onlineMonth:number})=>{p.status='online';p.onlineMonth=0;});
 useStore.setState({state:s,draft:s});
 });
 await expect((await adviceElement(page, 'next-step-card'))).toContainText('Start commissioning on H1');
 const hall=page.getByRole('button',{name:/H1 Commissioning - ready/});await expect(hall).toBeVisible();await hall.click();
 const start=page.getByRole('button',{name:/^Start commissioning: H1 \(Uses/});await expect(start).toBeVisible();await start.click();
 await expect(page.getByRole('button',{name:/H1 Commissioning - testing/})).toBeVisible();
 await page.screenshot({path:'docs/screenshots/cold2/commissioning-words.png'});
});

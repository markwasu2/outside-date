import {test,expect} from '@playwright/test';

test('commissioning points to plants when substation is already energized',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);
 s.halls=s.halls.slice(0,1);const h=s.halls[0];h.stageIndex=4;h.stageActive=false;h.energized=false;
 s.flags.siteOptioned=1;for(const p of Object.values(s.permits) as {status:string}[])p.status='granted';
 s.power.studyStatus='done';s.power.substationStatus='done';s.power.interimGridMW=0;
 s.power.plants.forEach((p:{onlineMonth:number|null;plannedOnlineMonth:number})=>{p.onlineMonth=null;p.plannedOnlineMonth=40;});
 s.docket.status='approved';useStore.setState({state:s,draft:s});
 });
 await page.getByRole('button',{name:/H1 Commissioning - waiting on power hookup/}).click();
 const start=page.getByRole('button',{name:/^Start commissioning: H1 \(Uses/});
 await expect(start).toBeDisabled();await expect(start).toContainText('Open Power plants');
 await expect(start).toContainText('substation is energized');await expect(start).not.toContainText('check the study');
 await page.screenshot({path:'docs/screenshots/cold2/commissioning-power-blocker.png'});
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Actions',exact:true}).click();
 await page.getByRole('checkbox',{name:'Also show unavailable choices'}).check();
 await expect(page.getByRole('complementary',{name:'What you can do this month'})).toContainText('Open Power plants');
});

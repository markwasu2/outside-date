import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('a player who overlooks power can inspect the actual blocker and recover without restarting',async({page})=>{
 test.setTimeout(60000);await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.locator('[data-map-control="road"] button').click();await page.locator('[data-map-control="siteOffice"] button').click();await page.getByRole('button',{name:'Apply for building permit',exact:true}).click();await page.getByTestId('simple-object-panel').getByRole('button',{name:'Close',exact:true}).click();
 for(let i=0;i<16;i++){
  const slider=page.getByTestId('event-scale');if(await slider.count()){await slider.fill('0');await page.getByTestId('event-choice-commit').click();}
  const control=page.locator('[data-map-control="H1"] button'),label=await control.innerText();
  if(/Test & open/.test(label))break;
  if(/Build foundation|Build frame|Build walls|Install interiors/.test(label)&&await control.isEnabled())await control.click();
  const panel=page.getByTestId('simple-object-panel');if(await panel.count())await panel.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByTestId('simple-next-month').click();
 }
 await expect(page.getByTestId('simple-feedback')).toContainText('Final testing needs power.');await page.locator('[data-campus-object="H1"]').click();await expect(page.getByTestId('simple-object-panel')).toContainText('power');await page.screenshot({path:'/tmp/cold-missed-power.png'});await page.getByTestId('night-view').click();await expect(page.getByTestId('hall-night-lights')).toHaveCount(0);await page.getByTestId('night-view').click();
 await page.getByTestId('inspect-power').click();await expect(page.getByTestId('simple-object-panel')).toContainText('Power connection');
 await page.getByTestId('simple-object-panel').getByRole('button',{name:'Start power study',exact:true}).click();await page.getByTestId('simple-object-panel').getByRole('button',{name:'Order electrical equipment',exact:true}).click();await page.getByTestId('simple-object-panel').getByRole('button',{name:'Close',exact:true}).click();
 for(let i=0;i<14;i++){
  const slider=page.getByTestId('event-scale');if(await slider.count()){await slider.fill('0');await page.getByTestId('event-choice-commit').click();}
  if(await page.getByTestId('simple-sell').count()){await page.screenshot({path:'/tmp/cold-power-recovered.png'});await page.getByTestId('simple-sell').click();await page.getByTestId('commit-takeout').click();break;}
  const control=page.locator('[data-map-control="H1"] button');if(await control.count()&&await control.isEnabled()&&/Test & open|Repair/.test(await control.innerText()))await control.click();
  const panel=page.getByTestId('simple-object-panel');if(await panel.count())await panel.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByTestId('simple-next-month').click();
 }
 await expect(page.getByRole('heading',{name:'Campus sold',exact:true})).toBeVisible();
});

test('an already finished power connection points to real capacity, not a repeated study',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.evaluate(async()=>{
 // @ts-expect-error test browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.flags.siteOptioned=true;s.halls[0].stageIndex=4;s.power.substationStatus='done';s.power.interimGridMW=0;s.power.plants=[];for(const p of Object.values(s.permits) as {status:string}[])p.status='granted';useStore.setState({state:s,draft:s,plan:[]});
 });
 await page.locator('[data-campus-object="H1"]').click();await page.getByTestId('inspect-power').click();await expect(page.getByTestId('simple-power-capacity')).toContainText('No further power capacity is scheduled');await expect(page.getByTestId('simple-power-capacity')).toContainText('Waiting will not close this gap');await expect(page.getByTestId('simple-object-panel')).not.toContainText('Start power study');await page.screenshot({path:'/tmp/cold-power-capacity-gap.png'});
});
test('capacity ready for the next tick gives the automatic hookup instruction instead',async({page})=>{
 await page.goto('/');await page.getByTestId('start-first-campus').click();await page.evaluate(async()=>{
 // @ts-expect-error test browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.flags.siteOptioned=true;s.halls[0].stageIndex=4;s.power.substationStatus='done';for(const p of Object.values(s.permits) as {status:string}[])p.status='granted';useStore.setState({state:s,draft:s,plan:[]});
 });
 await page.locator('[data-campus-object="H1"]').click();await expect(page.getByTestId('simple-power-blocker')).toContainText('Advance the month for the automatic hookup');await expect(page.getByTestId('inspect-power')).toHaveCount(0);await expect(page.getByTestId('simple-feedback')).toContainText('Capacity is ready.');
});

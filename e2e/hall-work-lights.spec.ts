import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('working hall gets static night floodlights and loses them when work is undone',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();await expect(page.getByTestId('road-truck-headlights')).toHaveCount(0);await expect(page.getByTestId('road-car-headlights')).toHaveCount(0);await page.getByTestId('night-view').click();await expect(page.getByTestId('road-truck-headlights')).toBeVisible();await expect(page.getByTestId('road-car-headlights')).toBeVisible();await expect(page.getByTestId('service-truck-headlights')).toHaveCount(0);await page.emulateMedia({reducedMotion:'reduce'});await expect(page.getByTestId('ambient-truck')).toHaveCSS('animation-name','none');await page.screenshot({path:'/tmp/night-road-traffic.png'});await page.getByTestId('night-view').click();await expect(page.getByTestId('road-truck-headlights')).toHaveCount(0);await expect(page.getByTestId('road-car-headlights')).toHaveCount(0);
 await page.locator('[data-map-control=road] button').click();await page.locator('[data-map-control=siteOffice] button').click();await page.getByRole('button',{name:'Apply for building permit',exact:true}).click();await page.getByTestId('simple-object-panel').getByRole('button',{name:'Close',exact:true}).click();await page.locator('[data-map-control=H1] button').click();await page.getByTestId('night-view').click();await expect(page.getByTestId('service-truck-headlights')).toBeVisible();await expect(page.getByTestId('hall-work-lights')).toBeVisible();await page.screenshot({path:'/tmp/hall-work-lights-active.png'});await page.getByRole('button',{name:'Undo last order',exact:true}).click();await expect(page.getByTestId('service-truck-headlights')).toHaveCount(0);await expect(page.getByTestId('hall-work-lights')).toHaveCount(0);
});
test('night work lights follow inspection, funding and stand-down pauses per hall',async({page})=>{
 await page.goto('/');await page.getByTestId('start-first-campus').click();await page.locator('[data-map-control=road] button').click();await page.locator('[data-map-control=H1] button').click();await page.getByTestId('night-view').click();await expect(page.getByTestId('hall-work-lights')).toBeVisible();
 const baseline=await page.evaluate(async()=>{
  // @ts-expect-error visual pause fixture
  const {useStore}=await import('/src/ui/store.ts');return structuredClone(useStore.getState().draft);
 });
 for(const reason of ['inspection','funding','stand-down','unfunded','delivered']){
  await page.evaluate(async({reason,baseline})=>{
   // @ts-expect-error visual pause fixture
   const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(baseline);s.flags['inspectionFail:H1']=false;s.flags.drawFreeze=false;s.halls[0].pausedThisMonth=false;s.halls[0].delivered=false;
   if(reason==='inspection')s.flags['inspectionFail:H1']=true;if(reason==='funding')s.flags.drawFreeze=true;if(reason==='stand-down')s.halls[0].pausedThisMonth=true;if(reason==='unfunded'){s.cash=0;s.equity.committedTotal=s.equity.calledTotal;s.debt.seniorCommitment=s.debt.seniorDrawn;s.debt.mezzCommitment=s.debt.mezzDrawn;}if(reason==='delivered')s.halls[0].delivered=true;useStore.setState({state:s,draft:s,plan:[]});
  },{reason,baseline});
  await expect(page.getByTestId('hall-work-lights')).toHaveCount(0);
 }
});

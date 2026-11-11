import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
for(const width of [1280,1440])test(`site life and detailed assets fit desktop ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===1280?720:900});await page.goto('/');await page.getByTestId('start-first-campus').click();
 const traffic=page.getByTestId('ambient-truck');const first=await traffic.evaluate(el=>getComputedStyle(el).transform);
 await expect.poll(()=>traffic.evaluate(el=>getComputedStyle(el).transform)).not.toBe(first);
 await page.evaluate(async()=>{
  // @ts-expect-error test-only local import
  const {useStore}=await import('/src/ui/store.ts');const s=useStore.getState();const state=structuredClone(s.draft);state.flags.siteOptioned=true;state.power.substationStatus='done';state.power.studyStatus='done';state.halls[0].stageIndex=1;state.halls[0].stageActive=true;state.halls[0].stageMonthsDone=1;useStore.setState({state,draft:state,plan:[]});
 });
 await expect(page.getByTestId('stage-vehicle')).toBeVisible();await expect(page.getByTestId('stage-vehicle')).toHaveClass('site-crane');await page.screenshot({path:`/tmp/site-life-${width}-crane.png`});
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.getByTestId('campus-life')).toHaveAttribute('data-reduced-motion','true');await expect(page.getByTestId('stage-vehicle')).not.toHaveClass('site-crane');
 expect(await traffic.evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
 await page.evaluate(async()=>{
  // @ts-expect-error test-only local import
  const {useStore}=await import('/src/ui/store.ts');const s=useStore.getState();const state=structuredClone(s.draft);state.halls[0].delivered=true;state.halls[0].stageActive=false;state.halls[0].stageIndex=5;state.halls[0].stageMonthsDone=1;state.halls[0].energized=true;useStore.setState({state,draft:state,plan:[]});
 });
 await expect(page.getByTestId('support-yard')).toContainText('Cooling yard');await expect(page.getByTestId('campus-landscape')).toBeVisible();
 await expect(page.getByTestId('cooling-vapor')).toBeVisible();await expect(page.getByTestId('simple-goal')).toContainText('1/1');await page.screenshot({path:`/tmp/site-life-${width}-open.png`});
 await page.getByTestId('night-view').click();await expect(page.getByTestId('map-root')).toHaveAttribute('data-night','true');await page.screenshot({path:`/tmp/site-life-${width}-night.png`});
 await expect(page.getByTestId('simple-next-month')).toBeInViewport();
});

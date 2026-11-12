import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
for(const width of [1280,1440])test(`upcoming structures stay invisible until work advances at desktop ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===1280?720:900});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.locator('[data-map-control=road] button').click();
 for(const [stage,progress,active,paused,terminated] of [[1,0,false,false,false],[2,0,false,false,false],[3,0,true,false,false],[1,.5,true,false,false],[1,.5,true,true,false],[1,.5,false,false,true],[2,0,false,false,true]] as const){
 await page.evaluate(async({stage,progress,active,paused,terminated})=>{
 // @ts-expect-error display state fixture
 const {useStore}=await import('/src/ui/store.ts');
 // @ts-expect-error display duration fixture
 const {stageMinMonths}=await import('/src/ui/board/hallVisual.ts');
 const store=useStore.getState(),s=structuredClone(store.draft);s.halls[0].stageIndex=stage;s.halls[0].stageMonthsDone=stageMinMonths(s,store.content)[stage]*progress;s.halls[0].stageActive=active;s.halls[0].pausedThisMonth=paused;s.halls[0].terminated=terminated;useStore.setState({state:s,draft:s,plan:[]});
 },{stage,progress,active,paused,terminated});const next=page.getByTestId('hall-growth');await expect(next).toHaveAttribute('data-progress',progress.toFixed(3));await expect(next).toHaveCSS('opacity',String(progress*(terminated?.45:1)));if(stage===2&&progress===0&&!terminated)await page.screenshot({path:`/tmp/no-preview-frame-${width}.png`});
 }await page.getByTestId('night-view').click();await page.screenshot({path:`/tmp/no-preview-stopped-night-${width}.png`});
});

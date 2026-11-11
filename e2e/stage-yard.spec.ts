import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('construction supplies and parked equipment change with the build, not a permanent excavator',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();
 for(const [stage,label,image] of [[0,'Site preparation','tile-laydown'],[1,'Steel bundles & lifting','yard-steel'],[2,'Wall panels & loading','yard-panels'],[3,'Cooling yard','compound-cooling']] as const){
  await page.evaluate(async(stage)=>{
   // @ts-expect-error test browser import
   const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.flags.siteOptioned=true;s.halls[0].stageIndex=stage;s.halls[0].stageActive=true;s.halls[0].stageMonthsDone=.5;useStore.setState({state:s,draft:s,plan:[]});
  },stage);
  const yard=page.getByTestId('support-yard');await expect(yard).toContainText(label);await expect(yard.locator('img').first()).toHaveAttribute('src',new RegExp(image));await yard.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>(i as HTMLImageElement).decode())));await page.screenshot({path:`/tmp/stage-yard-${stage}.png`});
 }
});

import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('unfinished milestone opens the hall that still needs it instead of the first open hall',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();
 await page.evaluate(async()=>{
  // @ts-expect-error focused multi-hall fixture
  const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.flags.siteOptioned=true;const first=s.halls[0];first.stageIndex=5;first.stageActive=false;first.delivered=true;const second=structuredClone(first);second.id='H2';second.stageIndex=1;second.delivered=false;s.halls.push(second);useStore.setState({state:s,draft:s,plan:[],snapshots:[]});
 });
 await page.locator('[data-milestone="frame"]').click();await expect(page.getByRole('dialog',{name:'Build H2',exact:true})).toBeVisible();await page.screenshot({path:'/tmp/milestone-target-frame.png'});await page.getByTestId('simple-object-panel').getByRole('button',{name:'Close',exact:true}).click();await page.locator('[data-milestone="open"]').click();await expect(page.getByRole('dialog',{name:'Build H2',exact:true})).toBeVisible();
});

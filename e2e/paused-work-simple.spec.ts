import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('paused active work offers the real repair instead of telling a new player to keep waiting',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.locator('[data-map-control="road"] button').click();await page.locator('[data-map-control="H1"] button').click();
 await page.evaluate(async()=>{
 // @ts-expect-error test-only browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.flags['inspectionFail:H1']=true;useStore.setState({state:s,draft:s,plan:[],snapshots:[]});});
 await page.locator('[data-campus-object="H1"]').click();await expect(page.getByTestId('active-work-explanation')).toContainText('Repair the inspection');await expect(page.getByTestId('simple-object-panel').getByRole('button',{name:'Repair failed inspection',exact:true})).toBeEnabled();await page.screenshot({path:'/tmp/paused-work-repair.png'});await page.getByTestId('simple-object-panel').getByRole('button',{name:'Repair failed inspection',exact:true}).click();await expect(page.getByTestId('active-work-explanation')).toContainText('No repeat order needed');
});

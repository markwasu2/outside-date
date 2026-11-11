import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('single-hall courtyard has layered shade trees without covering the walkway',async({page})=>{
 await page.goto('/');await page.getByTestId('start-first-campus').click();await page.evaluate(async()=>{
 // @ts-expect-error courtyard art fixture
 const {useStore}=await import('/src/ui/store.ts');const now=structuredClone(useStore.getState().state);now.flags.siteOptioned=true;now.halls[0].stageIndex=5;now.halls[0].delivered=true;useStore.setState({state:now,draft:now,plan:[]});
 });await expect(page.getByTestId('courtyard-shade-tree')).toHaveCount(4);for(const tree of await page.getByTestId('courtyard-shade-tree').all()){await expect(tree.locator('ellipse')).toHaveCount(5);await expect(tree.locator('path')).toHaveCount(3);}await page.setViewportSize({width:1280,height:720});await page.screenshot({path:'/tmp/courtyard-canopy-day.png'});await page.getByTestId('night-view').click();await page.screenshot({path:'/tmp/courtyard-canopy-night.png'});
});

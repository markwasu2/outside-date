import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('single-hall courtyard never paints over a second building',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.evaluate(async()=>{
 // @ts-expect-error visual fixture
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.flags.siteOptioned=true;s.halls[0].stageIndex=4;useStore.setState({state:s,draft:s,plan:[]});});
 await expect(page.getByTestId('campus-courtyard')).toBeVisible();await page.evaluate(async()=>{
 // @ts-expect-error visual fixture
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);const h=structuredClone(s.halls[0]);h.id='H2';s.halls.push(h);useStore.setState({state:s,draft:s,plan:[]});});
 await expect(page.getByTestId('campus-courtyard')).toHaveCount(0);await page.screenshot({path:'/tmp/courtyard-multiple-clear.png'});
});

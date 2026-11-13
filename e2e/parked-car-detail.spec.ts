// Historical single-hall renderer regression. New default is covered by single-world and world-campus specs.
import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('parked cars get glazing and body detail only after a hall opens',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('outside-date-single-world-preview','false'));await page.goto('/');await page.getByTestId('start-first-campus').click();await expect(page.getByTestId('parked-car-detail')).toHaveCount(0);await page.evaluate(async()=>{
 // @ts-expect-error controlled occupied campus art fixture
 const {useStore}=await import('/src/ui/store.ts');const now=structuredClone(useStore.getState().state);now.flags.siteOptioned=true;now.halls[0].stageIndex=5;now.halls[0].delivered=true;useStore.setState({state:now,draft:now,plan:[]});
 });await expect(page.getByTestId('parked-car-detail')).toHaveCount(3);for(const car of await page.getByTestId('parked-car-detail').all())await expect(car.locator('path')).toHaveCount(7);await page.setViewportSize({width:1280,height:720});await page.screenshot({path:'/tmp/parked-car-fixture-day.png'});await page.getByTestId('night-view').click();await page.screenshot({path:'/tmp/parked-car-fixture-night.png'});
});

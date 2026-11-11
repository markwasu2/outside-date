import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('service road material follows developed campus without adding roads to the opening',async({page})=>{
 await page.goto('/');await page.getByTestId('start-first-campus').click();await expect(page.getByTestId('service-road-surface')).toHaveCount(0);
 await page.evaluate(async()=>{
 // @ts-expect-error controlled developed campus art fixture
 const {useStore}=await import('/src/ui/store.ts');const now=structuredClone(useStore.getState().state);now.flags.siteOptioned=true;now.halls[0].stageIndex=5;now.halls[0].delivered=true;useStore.setState({state:now,draft:now,plan:[]});
 });const road=page.getByTestId('service-road-surface');await expect(road).toBeVisible();await expect(road.locator('pattern')).toHaveCount(1);await expect(road.locator('path[stroke="url(#service-asphalt)"]')).toHaveCount(1);await page.setViewportSize({width:1280,height:720});await page.screenshot({path:'/tmp/service-road-fixture-day.png'});await page.getByTestId('night-view').click();await page.screenshot({path:'/tmp/service-road-fixture-night.png'});
});

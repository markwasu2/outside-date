// Historical single-hall renderer regression. New default is covered by single-world and world-campus specs.
import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('utility screen is layered low planting inside the existing bed',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('outside-date-single-world-preview','false'));await page.goto('/');await page.getByTestId('start-first-campus').click();await expect(page.getByTestId('utility-screen-planting')).toHaveCount(0);await page.evaluate(async()=>{
 // @ts-expect-error controlled developed campus art fixture
 const {useStore}=await import('/src/ui/store.ts');const now=structuredClone(useStore.getState().state);now.flags.siteOptioned=true;now.halls[0].stageIndex=5;now.halls[0].delivered=true;useStore.setState({state:now,draft:now,plan:[]});
 });const planting=page.getByTestId('utility-screen-planting');await expect(planting).toBeVisible();await expect(planting.locator('ellipse')).toHaveCount(40);const b=await planting.evaluate(el=>{const r=(el as SVGGraphicsElement).getBBox();return{x:r.x,y:r.y,right:r.x+r.width,bottom:r.y+r.height};});expect(b.x).toBeGreaterThanOrEqual(796);expect(b.right).toBeLessThanOrEqual(980);expect(b.y).toBeGreaterThanOrEqual(160);expect(b.bottom).toBeLessThanOrEqual(191);await page.setViewportSize({width:1280,height:720});await page.screenshot({path:'/tmp/utility-screen-fixture-day.png'});await page.getByTestId('night-view').click();await page.screenshot({path:'/tmp/utility-screen-fixture-night.png'});
});

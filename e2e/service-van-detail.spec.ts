// Historical single-hall renderer regression. New default is covered by single-world and world-campus specs.
import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('service van keeps its new detail inside the existing body',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('outside-date-single-world-preview','false'));await page.goto('/');await page.getByTestId('start-first-campus').click();await expect(page.getByTestId('service-van-detail')).toHaveCount(0);await page.evaluate(async()=>{
 // @ts-expect-error controlled developed campus fixture
 const {useStore}=await import('/src/ui/store.ts');const now=structuredClone(useStore.getState().state);now.flags.siteOptioned=true;now.halls[0].stageIndex=5;now.halls[0].delivered=true;useStore.setState({state:now,draft:now,plan:[]});
 });const detail=page.getByTestId('service-van-detail');await expect(detail).toBeVisible();await expect(detail.locator('path')).toHaveCount(7);const b=await detail.evaluate(el=>{const r=(el as SVGGraphicsElement).getBBox();return{x:r.x,y:r.y,right:r.x+r.width,bottom:r.y+r.height};});expect(b).toEqual({x:-10,y:-19,right:10,bottom:14});await page.setViewportSize({width:1280,height:720});await page.screenshot({path:'/tmp/service-van-fixture-day.png'});await page.getByTestId('night-view').click();await page.screenshot({path:'/tmp/service-van-fixture-night.png'});
});

import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('gatehouse detail appears only with the developed campus and stays in its footprint',async({page})=>{
 await page.goto('/');await page.getByTestId('start-first-campus').click();await expect(page.getByTestId('entry-gatehouse-detail')).toHaveCount(0);await page.evaluate(async()=>{
 // @ts-expect-error controlled developed campus art fixture
 const {useStore}=await import('/src/ui/store.ts');const now=structuredClone(useStore.getState().state);now.flags.siteOptioned=true;now.halls[0].stageIndex=5;now.halls[0].delivered=true;useStore.setState({state:now,draft:now,plan:[]});
 });const detail=page.getByTestId('entry-gatehouse-detail');await expect(detail).toBeVisible();await expect(detail.locator('path')).toHaveCount(11);const bounds=await detail.evaluate(el=>{const b=(el as SVGGraphicsElement).getBBox();return{x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height};});expect(bounds.x).toBeGreaterThanOrEqual(178);expect(bounds.right).toBeLessThanOrEqual(230);expect(bounds.y).toBeGreaterThanOrEqual(513);expect(bounds.bottom).toBeLessThanOrEqual(570);await page.setViewportSize({width:1280,height:720});await page.screenshot({path:'/tmp/entry-gatehouse-fixture-day.png'});await page.getByTestId('night-view').click();await page.screenshot({path:'/tmp/entry-gatehouse-fixture-night.png'});
});

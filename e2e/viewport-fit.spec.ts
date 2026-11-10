import {test,expect} from '@playwright/test';
test('desktop campus fits the viewport without a default body-margin scroll',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');
 expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(720);
 await page.getByRole('button',{name:'Tutorial',exact:true}).click();
 for(const [width,height] of [[1280,720],[1440,900]]){
  await page.setViewportSize({width,height});
  expect(await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}))).toEqual({width,height});
  const footer=await page.getByRole('button',{name:'End month',exact:true}).boundingBox();expect(footer!.y+footer!.height).toBeLessThanOrEqual(height);
 }
 await page.setViewportSize({width:1280,height:720});await page.screenshot({path:'docs/screenshots/cold2/campus-viewport-fit.png'});
});

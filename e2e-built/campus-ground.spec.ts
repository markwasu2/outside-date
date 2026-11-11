import {test,expect} from '@playwright/test';
test('built campus ground survives CSS parsing and the image decodes',async({page})=>{
 await page.goto('/');
 for(const ground of [page.getByTestId('opening-land').locator('..')]){
  const css=await ground.evaluate(el=>getComputedStyle(el).backgroundImage);
  expect(css).toMatch(/url\("(?:data:image\/svg|http[^" ]*campus-ground-)/);
  expect(await ground.evaluate(async el=>{const url=getComputedStyle(el).backgroundImage.match(/url\("([^"]+)"\)/)?.[1];if(!url)return false;const image=new Image();image.src=url;await image.decode();return image.naturalWidth>0;})).toBe(true);
 }
 await page.getByTestId('start-first-campus').click();
 const css=await page.getByTestId('map-root').evaluate(el=>getComputedStyle(el).backgroundImage);
 expect(css).toMatch(/url\("(?:data:image\/svg|http[^" ]*campus-ground-)/);
 await page.screenshot({path:'/tmp/campus-built-ground.png'});
});

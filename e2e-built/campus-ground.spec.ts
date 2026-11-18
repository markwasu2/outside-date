import {test,expect} from '@playwright/test';
test('built campus ground survives CSS parsing and the image decodes',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('outside-date-single-world-preview','false'));await page.goto('/');
 // The opening preview renders the one-ruler world scene, not the retired stretched picture.
 await expect(page.getByTestId('opening-land').getByTestId('world-ground')).toBeVisible();
 await expect(page.getByTestId('opening-land').getByTestId('world-woodland')).toBeVisible();
 await page.getByTestId('start-first-campus').click();
 const css=await page.getByTestId('map-root').evaluate(el=>getComputedStyle(el).backgroundImage);
 expect(css).toMatch(/url\("(?:data:image\/svg|http[^" ]*campus-ground-)/);
 await page.locator('[data-scene-object="office"] > img').evaluate(async img=>{await (img as HTMLImageElement).decode();if(!(img as HTMLImageElement).naturalWidth)throw new Error('Office image failed to decode');});
 await page.screenshot({path:'/tmp/campus-built-ground.png'});
});

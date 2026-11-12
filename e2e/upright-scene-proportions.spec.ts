import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('people stand at an undistorted scale with feet fixed while the desktop scene resizes',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.locator('[data-map-control=road] button').click();await page.locator('[data-map-control=H1] button').click();await page.emulateMedia({reducedMotion:'reduce'});
 for(const size of [{width:1280,height:720},{width:1440,height:900},{width:1280,height:720}]){
  await page.setViewportSize(size);const worker=page.getByTestId('upright-site-worker').first();await expect(worker).toBeVisible();await expect.poll(async()=>worker.evaluate(el=>{const m=(el as SVGGraphicsElement).getScreenCTM()!;return Math.abs(Math.hypot(m.a,m.b)/Math.hypot(m.c,m.d)-1);})).toBeLessThan(.01);
  const crew=page.getByTestId('campus-people').locator('img');await expect(crew).toHaveCSS('width','80px');await expect(crew).toHaveCSS('height','80px');await crew.evaluate(e=>(e as HTMLImageElement).decode());const source=await crew.getAttribute('src');expect(await page.evaluate(async src=>(await(await fetch(src!)).text()).includes('grounded-crew-figures'),source)).toBe(true);await page.screenshot({path:`/tmp/upright-people-${size.width}.png`});
 }
 await page.getByTestId('campus-people').click();await expect(page.getByTestId('simple-object-panel')).toBeVisible();
});

import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('road vehicles keep their authored shape when desktop ground stretches',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.locator('[data-map-control=road] button').click();await page.locator('[data-map-control=H1] button').click();await page.emulateMedia({reducedMotion:'reduce'});
 for(const size of [{width:1280,height:720},{width:1440,height:900},{width:1280,height:720}]){
  await page.setViewportSize(size);
  for(const id of ['road-freight-vehicle','road-passenger-vehicle','road-site-service-vehicle']){const body=page.getByTestId(id);await expect(body).toBeVisible();await expect.poll(async()=>body.evaluate(el=>{const m=(el as SVGGraphicsElement).getScreenCTM()!;return Math.abs(Math.hypot(m.a,m.b)/Math.hypot(m.c,m.d)-1);})).toBeLessThan(.01);}
  await page.screenshot({path:`/tmp/vehicle-proportions-${size.width}-day.png`});await page.getByTestId('night-view').click();await page.screenshot({path:`/tmp/vehicle-proportions-${size.width}-night.png`});await page.getByTestId('night-view').click();
 }
});

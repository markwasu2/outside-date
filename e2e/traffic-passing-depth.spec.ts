import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
for(const width of [1280,1024])test(`far-lane cars stay behind nearer freight while passing ${width}`,async({page})=>{
 await page.setViewportSize({width,height:720});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByTestId('start-first-campus').click();
 await page.locator('[data-map-control=road] button').click();await page.locator('[data-map-control=siteOffice] button').click();await page.getByRole('button',{name:'Apply for building permit',exact:true}).click();await page.getByTestId('simple-object-panel').getByRole('button',{name:'Close',exact:true}).click();await page.locator('[data-map-control=H1] button').click();
 await page.getByTestId('world-zoom').click();
 const order=await page.getByTestId('world-road-traffic').evaluate(el=>[...el.children].map(c=>c.getAttribute('data-testid')));
 expect(order.indexOf('ambient-car')).toBeLessThan(order.indexOf('ambient-truck'));
 for(const time of [7,37]){
  await page.getByTestId('world-road-traffic').evaluate((el,t)=>{const svg=(el as SVGGraphicsElement).ownerSVGElement!;svg.pauseAnimations();svg.setCurrentTime(t)},time);
  await page.screenshot({path:`/tmp/traffic-depth-${width}-${time}-north.png`});
  await page.getByTestId('world-camera-scroll').evaluate(e=>{e.scrollTop=e.scrollHeight;e.scrollLeft=e.scrollWidth});
  await page.screenshot({path:`/tmp/traffic-depth-${width}-${time}-south.png`});
  await page.getByTestId('night-view').click();
  await page.screenshot({path:`/tmp/traffic-depth-${width}-${time}-south-night.png`});
  await page.getByTestId('night-view').click();
  await page.getByTestId('world-camera-scroll').evaluate(e=>{e.scrollTop=0;e.scrollLeft=0});
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(page.getByTestId('ambient-truck').locator('animateMotion')).toHaveCount(0);
 await page.screenshot({path:`/tmp/traffic-depth-${width}-reduced.png`});expect(errors).toEqual([]);
});

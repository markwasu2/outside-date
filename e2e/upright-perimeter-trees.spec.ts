import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
for(const width of [1280,1440])test(`perimeter trees keep their shape and roots while the desktop camera changes at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===1280?720:900});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-map-control=road] button').click();await page.locator('[data-map-control=H1] button').click();
 const check=async()=>{
  const trees=page.getByTestId('live-terrain').locator('[data-tree]');await expect.poll(()=>trees.count()).toBeGreaterThan(20);
  for(const i of [0,2,8,20]){
   const tree=trees.nth(i);await expect.poll(async()=>tree.evaluate(el=>{const body=el.querySelector('[data-testid="upright-perimeter-tree"]') as SVGGraphicsElement;const m=body.getScreenCTM()!;const edge=Number(getComputedStyle(el).getPropertyValue('--tree-edge-scale'));return Math.abs(Math.hypot(m.a,m.b)/(Math.hypot(m.c,m.d)/edge)-1);})).toBeLessThan(.01);
   const root=await tree.evaluate(el=>{const style=getComputedStyle(el),x=parseFloat(style.getPropertyValue('--tree-x')),y=parseFloat(style.getPropertyValue('--tree-y'));const body=el.querySelector('[data-testid="upright-perimeter-tree"]') as SVGGraphicsElement;const projected=new DOMPoint(x,y).matrixTransform(body.getScreenCTM()!);const ground=new DOMPoint(x,y).matrixTransform((el as SVGGraphicsElement).getScreenCTM()!);return Math.hypot(projected.x-ground.x,projected.y-ground.y);});expect(root).toBeLessThan(.01);
  }
 };
 await check();await page.screenshot({path:`/tmp/upright-trees-${width}-opening.png`});await page.getByTestId('simple-next-month').click();const scale=page.getByTestId('event-scale');if(await scale.count()){await scale.fill('0');await page.getByTestId('event-choice-commit').click();}await check();await page.screenshot({path:`/tmp/upright-trees-${width}-receipt-day.png`});await page.getByTestId('night-view').click();await page.screenshot({path:`/tmp/upright-trees-${width}-receipt-night.png`});await page.setViewportSize({width:width===1280?1440:1280,height:width===1280?900:720});await check();await page.getByRole('button',{name:'Detailed view',exact:true}).click();await check();await page.screenshot({path:`/tmp/upright-trees-${width}-detailed.png`});
});
test('a failed live-terrain fetch leaves the cached ground image and controls intact',async({page})=>{
 await page.route('**/*campus-woodland*',route=>route.request().resourceType()==='fetch'?route.abort():route.continue());await page.goto('/');await page.getByTestId('start-first-campus').click();await expect(page.getByTestId('live-terrain').locator('svg')).toHaveCount(0);expect(await page.getByTestId('map-root').evaluate(async el=>{const url=getComputedStyle(el).backgroundImage.match(/url\("([^"]+)"\)/)?.[1];if(!url)return false;const image=new Image();image.src=url;await image.decode();return image.naturalWidth>0;})).toBe(true);await page.locator('[data-map-control=road] button').click();await expect(page.locator('[data-map-control=road] button')).toHaveCount(0);
});

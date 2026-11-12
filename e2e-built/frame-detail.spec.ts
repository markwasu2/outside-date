import {test,expect} from '@playwright/test';

test('built foundation and frame art decode through real construction',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.locator('[data-map-control="road"] button').click();await page.locator('[data-map-control="H1"] button').click();
 await page.locator('[data-map-control="siteOffice"] button').click();await page.getByTestId('simple-do-action').filter({hasText:'Apply for building permit'}).click();await page.getByTestId('simple-object-panel').getByRole('button',{name:'Close',exact:true}).click();
const excavator=page.getByTestId('stage-vehicle').first();await excavator.evaluate(async img=>{await(img as HTMLImageElement).decode();});const source=await excavator.getAttribute('src');const svg=await page.evaluate(async src=>(await(await fetch(src!)).text()),source);for(const marker of ['excavator-tracked-undercarriage','excavator-cab-and-hydraulics','excavator-digging-bucket'])expect(svg.includes(marker)).toBe(true);await page.screenshot({path:'/tmp/excavator-built-day.png'});await page.getByTestId('night-view').click();await page.screenshot({path:'/tmp/excavator-built-night.png'});await page.getByTestId('night-view').click();
 for(let i=0;i<8;i++){
  if(await page.locator('[data-milestone="frame"][data-complete="true"]').count())break;
  const build=page.locator('[data-map-control="H1"] button');if(/^Build frame/.test(await build.innerText()))await build.click();
  await page.getByTestId('simple-next-month').click();const scale=page.getByTestId('event-scale');if(await scale.count()){await scale.fill('0');await page.getByTestId('event-choice-commit').click();}
  await page.locator('[data-testid="hall-art-frame"] img').evaluateAll(images=>Promise.all(images.map(img=>(img as HTMLImageElement).decode())));
  if(i===0){await page.screenshot({path:'/tmp/steel-built-foundation.png'});await page.getByTestId('night-view').click();await expect(page.locator('[data-testid=hall-art-frame] img[data-art-stage=pad]').first()).toHaveCSS('filter','brightness(0.68) saturate(0.76) drop-shadow(rgba(16, 30, 49, 0.25) 1px 2px 1px)');await page.screenshot({path:'/tmp/foundation-contact-night.png'});await page.getByTestId('night-view').click();}
 }
 await expect(page.locator('[data-milestone="frame"]')).toHaveAttribute('data-complete','true');const frame=page.locator('[data-art-stage=steel]').first();const src=await frame.getAttribute('src');expect(await page.evaluate(async src=>(await(await fetch(src!)).text()).includes('hall-frame-bracing'),src)).toBe(true);await page.screenshot({path:'/tmp/steel-built-frame.png'});await page.getByTestId('night-view').click();await page.screenshot({path:'/tmp/steel-built-frame-night.png'});
});

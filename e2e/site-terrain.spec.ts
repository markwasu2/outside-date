import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('real site choices paint distinct terrain without moving the campus',async({page})=>{
 test.setTimeout(60000);await page.setViewportSize({width:1280,height:720});
 const images:string[]=[];
 for(const [site,terrain] of [['edge5-campus','campus'],['edge5-meadow','meadow'],['edge5-siding','depot'],['quarry-ridge','quarry']] as const){
  await page.goto('/');await page.evaluate((detailed)=>{localStorage.clear();if(detailed)localStorage.setItem('outside-date-detailed','true');},terrain==='quarry');await page.reload();if(terrain==='quarry'){await page.locator('select').first().selectOption('whale');await page.getByRole('button',{name:'New game',exact:true}).click();}else await page.getByRole('button',{name:'Custom campus',exact:true}).click();await page.getByTestId(`site-card-${site}`).click();
  for(let step=0;step<8;step++)await page.getByRole('button',{name:/^Next:/}).click();await page.getByRole('button',{name:'Review closing table',exact:true}).click();await page.getByRole('button',{name:'Start campaign',exact:true}).click();if(terrain==='quarry')await page.getByRole('button',{name:'Simple view',exact:true}).click();
  await expect(page.getByTestId('map-root')).toHaveAttribute('data-terrain',terrain);await expect(page.getByTestId('simple-next-month')).toBeInViewport();
  const bg=await page.getByTestId('map-root').evaluate(el=>getComputedStyle(el).backgroundImage);images.push(bg);await page.getByTestId('map-root').evaluate(async el=>{const url=getComputedStyle(el).backgroundImage.match(/url\("?([^")]+)/)?.[1];if(!url){if(el.getAttribute('data-world-camera')==='true' && getComputedStyle(el).backgroundImage.startsWith('linear-gradient'))return;throw new Error('missing terrain');}const img=new Image();img.src=url;await img.decode();});
  if(await page.getByTestId('world-ground').count())await expect(page.getByTestId('world-power-pole')).toHaveCount(4);else await expect(page.getByTestId('live-terrain').getByTestId('upright-perimeter-tree').first()).toBeVisible();
  await page.screenshot({path:`/tmp/site-terrain-${terrain}-1280.png`});await page.getByTestId('night-view').click();await page.screenshot({path:`/tmp/site-terrain-${terrain}-night.png`});await page.getByTestId('night-view').click();await page.locator('[data-map-control="road"] button').click();await expect(page.locator('[data-map-control="road"] button')).toHaveCount(0);
 }
 expect(new Set(images).size).toBe(4);
});

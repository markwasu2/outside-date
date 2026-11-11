import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
for(const width of [1280,1440])test(`power connection state stays clear of the plant yard at desktop ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===1280?720:900});await page.addInitScript(()=>{localStorage.setItem('outside-date-detailed','true');Math.random=()=>.123456789;});await page.goto('/');await page.locator('select').first().selectOption('whale');await page.getByRole('button',{name:'New game',exact:true}).click();
 for(let step=0;step<8;step++)await page.getByRole('button',{name:/^Next:/}).click();await page.getByRole('button',{name:'Review closing table',exact:true}).click();await page.getByRole('button',{name:'Start campaign',exact:true}).click();await page.getByRole('button',{name:'Simple view',exact:true}).click();
 for(const state of ['not-started','study-pending','next-month']){
  if(state==='study-pending'){await page.locator('[data-map-control="substation"] button').click();await page.getByTestId('simple-object-panel').getByRole('button',{name:/Start power study/}).click();await page.getByTestId('simple-object-panel').getByRole('button',{name:'Close',exact:true}).click();}
  if(state==='next-month')await page.getByTestId('simple-next-month').click();
  const connection=await page.getByTestId('power-map-state').boundingBox(),plants=await page.locator('[data-scene-object="plants"]').getByText('Power plants',{exact:true}).boundingBox();expect(connection&&plants).toBeTruthy();expect(plants!.y).toBeGreaterThanOrEqual(connection!.y+connection!.height+8);
  await page.screenshot({path:`/tmp/power-yard-${width}-${state}.png`});
 }
});

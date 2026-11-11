import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('a real four-hall foundation milestone moves from completed H1 to unfinished H2',async({page})=>{
 test.setTimeout(60000);await page.setViewportSize({width:1280,height:720});await page.addInitScript(()=>{localStorage.setItem('outside-date-detailed','true');Math.random=()=>.123456789;});await page.goto('/');await page.locator('select').first().selectOption('whale');await page.getByRole('button',{name:'New game',exact:true}).click();
 for(let step=0;step<8;step++)await page.getByRole('button',{name:/^Next:/}).click();await page.getByRole('button',{name:'Review closing table',exact:true}).click();await page.getByRole('button',{name:'Start campaign',exact:true}).click();await page.getByRole('button',{name:'Simple view',exact:true}).click();await page.locator('[data-map-control="road"] button').click();await page.locator('[data-map-control="H1"] button').click();
 for(let i=0;i<8;i++){
  if((await page.getByTestId('caption-H1').innerText()).startsWith('Frame'))break;
  await page.getByTestId('simple-next-month').click();const slider=page.getByTestId('event-scale');if(await slider.count()){await slider.fill('0');await page.getByTestId('event-choice-commit').click();}
 }
 await expect(page.getByTestId('caption-H1')).toContainText('Frame');await page.locator('[data-milestone="foundation"]').click();await expect(page.getByRole('dialog',{name:'Build H2',exact:true})).toBeVisible();await page.screenshot({path:'/tmp/milestone-target-real-four-hall.png'});
});

import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('a cold player can recover from missing the building permit without restarting',async({page})=>{
 test.setTimeout(60000);await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.locator('[data-map-control="road"] button').click();await page.locator('[data-map-control="H1"] button').click();
 await page.getByTestId('simple-next-month').click();await page.getByTestId('event-scale').fill('0');await page.getByTestId('event-choice-commit').click();
 await expect(page.getByTestId('simple-feedback')).toContainText('Construction needs the building permit.');await expect(page.getByTestId('simple-feedback')).toContainText('Waiting alone will not start the review.');
 await page.locator('[data-map-control="H1"] button').click();await page.getByTestId('inspect-permits').click();await page.getByTestId('simple-object-panel').getByRole('button',{name:'Apply for building permit',exact:true}).click();await page.getByTestId('simple-object-panel').getByRole('button',{name:'Close',exact:true}).click();await page.screenshot({path:'/tmp/cold-permit-filed.png'});
 // Continue by inspecting visible construction and power options, not a scripted next-step card.
 for(let i=0;i<30;i++){
  const slider=page.getByTestId('event-scale');if(await slider.count()){await slider.fill('0');await page.getByTestId('event-choice-commit').click();}
  if(await page.getByTestId('simple-sell').count()){await page.screenshot({path:'/tmp/cold-permit-recovered.png'});await page.getByTestId('simple-sell').click();await page.getByTestId('commit-takeout').click();break;}
  for(const id of ['H1','substation']){
   const control=page.locator(`[data-map-control="${id}"] button`);if(!await control.count()||!await control.isEnabled())continue;const name=await control.innerText();await control.click();
   if(/Build frame|Build walls|Install interiors|Test & open|Repair/.test(name))continue;
   await expect(page.getByTestId('simple-object-panel')).toBeVisible();
   const panel=page.getByTestId('simple-object-panel');if(!await panel.count())continue;
   for(const label of ['Start power study','Order electrical equipment']){const b=panel.getByRole('button',{name:label,exact:true});if(await b.count()&&await b.isEnabled())await b.click();}
   await panel.getByRole('button',{name:'Close',exact:true}).click();
  }
  await page.getByTestId('simple-next-month').click();
 }
 await expect(page.getByRole('heading',{name:'Campus sold',exact:true})).toBeVisible();
});

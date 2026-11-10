import {expect,test} from '@playwright/test';
test('takeout and final report stay with the actual campus',async({page})=>{
  await page.goto('/');await page.getByTestId('quick-start').click();
  await page.evaluate(()=>{
    (window as unknown as {__debugRunBot:(bot:string,scenario:string,difficulty:string,seed:number)=>void}).__debugRunBot('competent','whale','normal',3);
  });
  await expect(page.getByTestId('closeout-campus')).toBeVisible();
  const skip=page.getByRole('button',{name:'Skip',exact:true});if(await skip.count())await skip.click();
  await expect(page.getByRole('heading',{name:'Rating the campus'})).toBeVisible();
  await page.getByText(/Your equity:/).first().waitFor();
  await page.waitForTimeout(600); // finish the skipped reveal's opacity transition before pixel inspection
  await page.screenshot({path:'docs/screenshots/cold2/closing-rating.png'});
  await page.getByRole('button',{name:'Look around campus',exact:true}).click();
  await expect(page.getByTestId('closeout-conversation')).not.toBeVisible();
  await page.getByRole('button',{name:'Return to closeout',exact:true}).click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Report card',exact:true})).toBeVisible();
  await expect(page.getByTestId('map-root')).toBeVisible();
  await expect(page.getByRole('button',{name:'End month',exact:true})).toHaveCount(0);
  await page.setViewportSize({width:1440,height:900});
  await page.screenshot({path:'docs/screenshots/cold2/closing-report-1440.png'});
});

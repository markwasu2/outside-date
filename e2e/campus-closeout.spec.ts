import {expect,test} from '@playwright/test';
test('takeout and final report stay with the actual campus',async({page})=>{
  await page.goto('/');await page.getByTestId('quick-start').click();
  await page.evaluate(()=>{
    (window as unknown as {__debugRunBot:(bot:string,scenario:string,difficulty:string,seed:number)=>void}).__debugRunBot('competent','whale','normal',3);
  });
  await page.evaluate(async()=>{
    // @ts-expect-error dev browser source import
    const {useStore}=await import('/src/ui/store.ts');useStore.getState().autosave();
  });
  await expect(page.getByTestId('closeout-campus')).toBeVisible();
  const skip=page.getByRole('button',{name:'Skip',exact:true});if(await skip.count())await skip.click();
  await expect(page.getByRole('heading',{name:'Rating the campus'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Back to site gate',exact:true})).toHaveCount(0);
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
  await expect(page.getByRole('button',{name:'Back to site gate',exact:true})).toBeInViewport();
  await page.getByRole('button',{name:'Back to site gate',exact:true}).click();
  await expect(page.getByTestId('quick-start')).toBeVisible();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByTestId('closeout-campus')).toBeVisible();
  const skipReload=page.getByRole('button',{name:'Skip',exact:true});if(await skipReload.count())await skipReload.click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Report card',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Back to site gate',exact:true}).click();
  await page.getByTestId('quick-start').click();
  await expect(page.getByTestId('campus-workspace')).toBeVisible();
  await expect(page.getByTestId('campus-status')).toContainText('Y1 M1');
});


test('takeout preview stays on campus until committed and survives reload',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser source import
 const {useStore}=await import('/src/ui/store.ts');
 (window as unknown as {__debugRunBot:(bot:string,scenario:string,difficulty:string,seed:number)=>void}).__debugRunBot('competent','whale','normal',3);
 const store=useStore.getState(),s=structuredClone(store.state);s.phase='takeoutAvailable';s.takeout=null;s.outcome=null;useStore.setState({state:s,draft:s});useStore.getState().autosave();
 });
 await page.getByRole('button',{name:'Price the takeout to finish the campaign',exact:true}).click();
 await expect(page.getByTestId('campus-workspace')).toBeVisible();
 await expect(page.getByTestId('closeout-campus')).toHaveCount(0);
 await expect(page.getByTestId('takeout-preview-card')).toBeVisible();
 await expect(page.getByRole('button',{name:'End month',exact:true})).toBeDisabled();
 await page.screenshot({path:'docs/screenshots/cold2/takeout-commit-preview.png'});
 await page.getByTestId('commit-takeout').click();
 await expect(page.getByTestId('closeout-campus')).toBeVisible();
 await page.reload();await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.getByTestId('closeout-campus')).toBeVisible();
 await expect(page.getByTestId('campus-workspace')).toHaveCount(0);
});

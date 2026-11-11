import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('a player who buys land but never builds gets an understandable loss and can restart',async({page})=>{
 test.setTimeout(45000);await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.locator('[data-map-control="road"] button').click();
 for(let i=0;i<34;i++){
  if(await page.getByTestId('simple-result').count())break;
  const slider=page.getByTestId('event-scale');if(await slider.count()){await slider.fill('0');await page.getByTestId('event-choice-commit').click();}
  if(await page.getByTestId('simple-result').count())break;
  if(await page.getByTestId('simple-sell').count())break;
  await page.getByTestId('simple-next-month').click();
 }
 await expect(page.getByRole('heading',{name:'Project ended',exact:true})).toBeVisible();await expect(page.getByTestId('loss-position')).toContainText('No foundation was started');await expect(page.getByTestId('loss-position')).toContainText('not cash for monthly bills');await expect(page.getByTestId('simple-result')).not.toContainText('Game over: default');await page.screenshot({path:'/tmp/cold-no-build-loss.png'});await expect(page.getByTestId('simple-result')).toContainText('0/1 data centers opened');await page.getByRole('button',{name:'Play again',exact:true}).click();await expect(page.getByTestId('start-first-campus')).toBeVisible();
});
test('deadline loss uses the termination cause, not a later unrelated warning',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.evaluate(async()=>{
 // @ts-expect-error test-only import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.phase='ended';s.outcome={kind:'lose',reason:'allTerminated'};s.month=29;s.halls[0].terminated=true;s.log=[{month:29,kind:'warning',text:'H1 missed its outside date and was terminated.'},{month:29,kind:'warning',text:'Conversion test failed (DSCR 0.00); interest steps up and is now cash-paid.'},{month:29,kind:'lose',text:'Game over: allTerminated.'}];useStore.setState({state:s,draft:s});});
 await expect(page.getByTestId('loss-position')).toContainText('Last warning: H1 missed its final deadline and was terminated.');await expect(page.getByTestId('loss-position')).not.toContainText('Conversion test');await page.screenshot({path:'/tmp/cold-deadline-loss.png'});
});

import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('a finished foundation after an event choice gets the same optional milestone feedback as an ordinary month',async({page})=>{
 await page.addInitScript(()=>{
  const w=window as unknown as {played:number[];AudioContext:unknown};w.played=[];
  w.AudioContext=class{currentTime=0;destination={};createOscillator(){const frequency={value:0};return {frequency,connect(){return this;},start(){w.played.push(frequency.value);},stop(){},onended:null};}createGain(){return {gain:{value:0},connect(){return this;}};}close(){return Promise.resolve();}};
 });
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.getByRole('button',{name:'Sound off',exact:true}).click();await page.locator('[data-map-control="road"] button').click();await page.locator('[data-map-control="H1"] button').click();await page.getByTestId('simple-next-month').click();await page.getByTestId('event-scale').fill('0');await page.getByTestId('event-choice-commit').click();
 await expect(page.getByTestId('receipt-headline')).toContainText('Foundation');expect(await page.evaluate(()=>(window as unknown as {played:number[]}).played.filter(n=>n===880))).toHaveLength(1);await page.screenshot({path:'/tmp/foundation-small-win.png'});
 const receipt=page.getByTestId('monthly-receipt');await expect(receipt).toHaveClass('monthly-achievement');await page.emulateMedia({reducedMotion:'reduce'});await expect(receipt).toHaveCSS('animation-name','none');await page.getByRole('button',{name:'Sound on',exact:true}).click();await page.locator('[data-map-control="H1"] button').click();await page.getByTestId('inspect-permits').click();await page.getByRole('button',{name:'Apply for building permit',exact:true}).click();expect(await page.evaluate(()=>(window as unknown as {played:number[]}).played.filter(n=>n===880))).toHaveLength(1);
});

test('a setback stays first without hiding a milestone completed in the same month',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.locator('[data-map-control="road"] button').click();await page.locator('[data-map-control="H1"] button').click();await page.getByTestId('simple-next-month').click();await page.getByTestId('event-scale').fill('0');await page.getByTestId('event-choice-commit').click();
 await page.evaluate(async()=>{
 // @ts-expect-error test browser import
 const {useStore}=await import('/src/ui/store.ts');const review=structuredClone(useStore.getState().monthReview);review.after.flags.drawFreeze=true;useStore.setState({state:review.after,draft:review.after,monthReview:review,plan:[],snapshots:[]});});
 const receipt=page.getByTestId('monthly-receipt');await expect(receipt.getByTestId('receipt-headline')).toHaveText('Setback this month');await expect(receipt.getByTestId('receipt-development')).toContainText('lender froze');await expect(receipt.getByTestId('receipt-completed-alongside-setback')).toHaveText('Also completed: Land + Foundation.');await expect(receipt).not.toHaveClass('monthly-achievement');await expect(page.getByTestId('simple-next-month')).toBeInViewport();const frozen=await receipt.innerText();await page.locator('[data-map-control="H1"] button').click();expect(await receipt.innerText()).toBe(frozen);await page.getByTestId('simple-object-panel').getByRole('button',{name:'Close',exact:true}).click();await page.screenshot({path:'/tmp/mixed-month-milestone.png'});
});

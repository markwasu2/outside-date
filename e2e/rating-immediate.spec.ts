import {test,expect} from '@playwright/test';
test('rating shows final score and money on its first frame without waiting for animation',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>typeof (window as unknown as {__debugRunBot?:unknown}).__debugRunBot==='function');
 const expected=await page.evaluate(async()=>{
  (window as unknown as {__debugRunBot:(bot:string,scenario:string,difficulty:string,seed:number)=>void}).__debugRunBot('careful','millbrook-relay','normal',1);
  const {useStore}=await import('/src/ui/store.ts');return useStore.getState().draft.takeout;
 });
 for(const key of ['power','tenant','coverage','asset'] as const){
  const row=page.getByTestId(`rating-score-${key}`);await expect(row).toBeVisible();await expect(row).toContainText(expected!.scores[key].toFixed(1));
 }
 await expect(page.getByTestId('rating-cap-rate')).toBeVisible();await expect(page.getByTestId('rating-values')).toBeVisible();
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Skip',exact:true})).toHaveCount(0);
 await page.screenshot({path:'docs/screenshots/cold2/rating-final-values.png'});
});

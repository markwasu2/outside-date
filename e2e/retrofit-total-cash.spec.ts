import {test,expect} from '@playwright/test';
test('retrofit event shows aggregate charge and cash default warning before a choice',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);
 s.cash=50000000;s.setup.hallTier='air';s.phase='awaitingChoice';s.pending={cardId:'chip_generation',choices:[{id:'retrofit',label:'Retrofit every undelivered hall'},{id:'decline',label:'Decline the upgrade'}]};
 useStore.setState({state:s,draft:s});
 });
 const preview=page.getByTestId('retrofit-cash-preview');await expect(preview).toContainText('4 undelivered halls');
 await expect(preview).toContainText('$60.0M total');await expect(preview).toContainText('after retrofit -$10.0M');await expect(preview).toContainText('risks immediate default');
 await expect(page.getByRole('button',{name:/^Retrofit every/})).toBeEnabled();
 await page.screenshot({path:'docs/screenshots/cold2/retrofit-total-cash.png'});
 await page.getByRole('button',{name:/^Decline the upgrade/}).click();await expect(preview).toHaveCount(0);
});

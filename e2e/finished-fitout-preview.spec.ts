import {test,expect} from '@playwright/test';

test('rack retrofit explains why finished fitout will not be delayed',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState(),s=structuredClone(store.state);
 s.setup.hallTier='liquid';s.halls.forEach((h:{stageIndex:number;stageActive:boolean})=>{h.stageIndex=4;h.stageActive=false;});
 s.phase='awaitingChoice';s.pending={cardId:'chip_generation',choices:[{id:'retrofit',label:'Retrofit every undelivered hall'},{id:'decline',label:'Decline the upgrade'}]};useStore.setState({state:s,draft:s});
 });
 const retrofit=page.getByTestId('event-choice').filter({hasText:'Retrofit every undelivered hall'});
 await expect(retrofit).toContainText('+1 month of remaining fitout');await expect(retrofit).toContainText('Finished fitout is not delayed.');
 await page.screenshot({path:'docs/screenshots/cold2/finished-fitout-preview.png'});
 await retrofit.click();await expect(page.getByTestId('campus-event-card')).toHaveCount(0);
});

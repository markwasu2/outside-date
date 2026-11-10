import {test,expect} from '@playwright/test';
test('labor agreement uses monthly percentages before choosing',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState(),s=structuredClone(store.state);
 s.phase='awaitingChoice';s.pending={cardId:'union_pla',choices:[{id:'sign',label:'Sign the agreement'},{id:'decline',label:'Decline'}]};useStore.setState({state:s,draft:s});
 });
 const sign=page.getByTestId('event-choice').filter({hasText:'Sign the agreement'});
 await expect(sign).toContainText('Hall budgets +2%');await expect(sign).toContainText('22% to 5% each month');
 await expect(page.getByTestId('event-choice').filter({hasText:'Decline'})).toContainText('22% each month');
 await page.screenshot({path:'docs/screenshots/cold2/labor-probability-words.png'});
 await sign.click();await expect(page.getByTestId('campus-event-card')).toHaveCount(0);
});

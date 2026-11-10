import {test,expect} from '@playwright/test';
test('labor agreement uses monthly percentages before choosing',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState(),s=structuredClone(store.state);
 s.phase='awaitingChoice';s.pending={cardId:'union_pla',choices:[{id:'sign',label:'Sign the agreement'},{id:'decline',label:'Decline'}]};useStore.setState({state:s,draft:s});
 });
 const stakes=page.getByTestId('event-scale-stakes');
 await expect(stakes).toContainText('22% each month');
 await page.getByTestId('event-scale').press('End');
 await expect(stakes).toContainText('Hall budgets +2%');await expect(stakes).toContainText('22% to 5% each month');
 await page.screenshot({path:'docs/screenshots/cold2/labor-probability-words.png'});
 await page.getByTestId('event-choice-commit').click();await expect(page.getByTestId('campus-event-card')).toHaveCount(0);
});

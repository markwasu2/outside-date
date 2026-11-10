import {test,expect} from '@playwright/test';

test('partner dispute shows dilution and the temporary all-hall pause before commitment',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState(),s=structuredClone(store.state),card=store.content.events.find((c:{id:string})=>c.id==='partner_dispute');
 s.phase='awaitingChoice';s.pending={cardId:card.id,choices:card.choices};useStore.setState({state:s,draft:s});
 });
 const stakes=page.getByTestId('event-scale-stakes');
 await expect(stakes).toContainText('All halls pause for 1 month');await expect(stakes).toContainText('Cash -$10.0M');await expect(stakes).not.toContainText('until the problem is fixed');
 await page.getByTestId('event-scale').press('End');
 await expect(stakes).toContainText('Your equity share -8 percentage points');await expect(stakes).toContainText('Cash -$20.0M');await expect(stakes).not.toContainText('Has consequences');
 await page.screenshot({path:'docs/screenshots/cold2/partner-dispute-stakes.png'});
 await page.getByTestId('event-scale').press('Home');
 await page.getByTestId('event-choice-commit').click();await expect(page.getByTestId('campus-event-card')).toHaveCount(0);
});

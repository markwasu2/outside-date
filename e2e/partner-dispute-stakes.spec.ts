import {test,expect} from '@playwright/test';

test('partner dispute shows dilution and the temporary all-hall pause before commitment',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState(),s=structuredClone(store.state),card=store.content.events.find((c:{id:string})=>c.id==='partner_dispute');
 s.phase='awaitingChoice';s.pending={cardId:card.id,choices:card.choices};useStore.setState({state:s,draft:s});
 });
 const concede=page.getByTestId('event-choice').filter({hasText:'Concede a bigger share'}),wait=page.getByTestId('event-choice').filter({hasText:'Wait it out'});
 await expect(concede).toContainText('Your equity share -8 percentage points');await expect(concede).toContainText('Cash -$20.0M');await expect(concede).not.toContainText('Has consequences');
 await expect(wait).toContainText('All halls pause for 1 month');await expect(wait).toContainText('Cash -$10.0M');await expect(wait).not.toContainText('until the problem is fixed');
 await page.screenshot({path:'docs/screenshots/cold2/partner-dispute-stakes.png'});
 await wait.click();await expect(page.getByTestId('campus-event-card')).toHaveCount(0);
});

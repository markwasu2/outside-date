import {test,expect} from '@playwright/test';

test('subpoena fighting discloses the vote delay and uncertain extra goodwill loss',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState(),s=structuredClone(store.state),card=store.content.events.find((c:{id:string})=>c.id==='subpoena');
 s.phase='awaitingChoice';s.pending={cardId:card.id,choices:card.choices};useStore.setState({state:s,draft:s});
 });
 await page.getByTestId('event-scale').press('End');
 const fight=page.getByTestId('event-scale-stakes');
 await expect(fight).toContainText('Docket vote slips 3 months');await expect(fight).toContainText(/Town goodwill \d+ → \d+ \(permit and docket-vote odds\)/);await expect(fight).toContainText('50% chance of Town goodwill -10');await expect(fight).not.toContainText('Has consequences');
 await page.screenshot({path:'docs/screenshots/cold2/subpoena-preview.png'});
 await page.getByTestId('event-choice-commit').click();await expect(page.getByTestId('campus-event-card')).toHaveCount(0);
});

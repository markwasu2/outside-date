import {test,expect} from '@playwright/test';

test('hiring-fair choice explains the six-month crew benefit even with a terse story variant',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState(),s=structuredClone(store.state),card=store.content.events.find((c:{id:string})=>c.id==='hiring_fair');
 s.phase='awaitingChoice';s.pending={cardId:card.id,choices:card.choices,body:card.bodyVariants[0]};useStore.setState({state:s,draft:s});
 });
 await page.getByTestId('event-scale').press('End');
 const host=page.getByTestId('event-scale-stakes');
 await expect(host).toContainText('Cash -$1.0M');await expect(host).toContainText(/Town goodwill \d+ → \d+/);await expect(host).toContainText('Fewer labor shortages for 6 months');await expect(host).not.toContainText('Has consequences');
 await page.screenshot({path:'docs/screenshots/cold2/hiring-fair-benefit.png'});
 await page.getByTestId('event-choice-commit').click();await expect(page.getByTestId('campus-event-card')).toHaveCount(0);
});

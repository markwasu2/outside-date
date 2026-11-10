import {test,expect} from '@playwright/test';

test('hiring-fair choice explains the six-month crew benefit even with a terse story variant',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState(),s=structuredClone(store.state),card=store.content.events.find((c:{id:string})=>c.id==='hiring_fair');
 s.phase='awaitingChoice';s.pending={cardId:card.id,choices:card.choices,body:card.bodyVariants[0]};useStore.setState({state:s,draft:s});
 });
 const host=page.getByTestId('event-choice').filter({hasText:'Sponsor a booth'});
 await expect(host).toContainText('Cash -$1.0M');await expect(host).toContainText('Town goodwill +6');await expect(host).toContainText('Fewer labor shortages for 6 months');await expect(host).not.toContainText('Has consequences');
 await page.screenshot({path:'docs/screenshots/cold2/hiring-fair-benefit.png'});
 await host.click();await expect(page.getByTestId('campus-event-card')).toHaveCount(0);
});

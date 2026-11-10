import {test,expect} from '@playwright/test';

test('expansion warns about a permanent dry-cooling power gap before the answer',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState(),s=structuredClone(store.state),card=store.content.events.find((c:{id:string})=>c.id==='the_ask');
 s.setup.cooling='dry';s.phase='awaitingChoice';s.pending={cardId:card.id,choices:card.choices};useStore.setState({state:s,draft:s});
 });
 await page.getByTestId('event-scale').press('End');
 const power=page.getByTestId('expansion-power');await expect(power).toContainText('6 halls need 202.5 MW');await expect(power).toContainText('8.5 MW short');
 await power.scrollIntoViewIfNeeded();await page.screenshot({path:'docs/screenshots/cold2/expansion-power-gap.png'});
 await page.screenshot({path:'docs/screenshots/cold2/expansion-power-choice.png'});
 await page.getByTestId('event-choice-commit').click();await expect(page.getByRole('button',{name:/^H6 Not started/})).toBeVisible();
});

test('a fully online but undersized supply does not tell H6 to wait for another plant',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');
 // @ts-expect-error dev browser import
 const {applyEffect}=await import('/src/engine/effects.ts');const store=useStore.getState();const s=applyEffect(structuredClone(store.state),{type:'addAskHalls',args:[]},store.content);
 s.setup.cooling='dry';s.month=58;s.docket.status='approved';s.flags.siteOptioned=true;s.power.studyStatus='done';s.power.substationStatus='done';
 Object.values(s.permits).forEach((p:{status:string})=>p.status='granted');s.power.plants.forEach((p:{onlineMonth:number})=>p.onlineMonth=40);
 s.halls.forEach((h:{delivered:boolean;energized:boolean;stageIndex:number;stageActive:boolean},i:number)=>{h.delivered=i<5;h.energized=i<5;h.stageIndex=i<5?5:4;h.stageActive=false;});useStore.setState({state:s,draft:s});
 });
 await expect(page.getByTestId('next-step-card')).toContainText('H6: power capacity is short');await page.getByTestId('next-step-show-me').click();
 const popup=page.getByTestId('map-popover');await expect(popup).toContainText('No further power capacity is scheduled');await expect(popup).toContainText('Waiting will not close this gap');
 await page.screenshot({path:'docs/screenshots/cold2/exhausted-power-gap.png'});
});

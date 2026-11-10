import {expect,test} from '@playwright/test';

test('repeat sponsorship shows the current expiry and skip leaves it intact',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser source import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState(),s=structuredClone(store.state);
 const card=store.content.events.find((c:{id:string})=>c.id==='hiring_fair');
 s.month=37;s.flags.hiringFairUntil=42;s.phase='awaitingChoice';s.pending={cardId:card.id,choices:card.choices};
 useStore.setState({state:s,draft:s});
 });
 const note=page.getByTestId('hiring-fair-renewal');
 await expect(note).toContainText('start of Y4 M7');await expect(note).toContainText('Y4 M8, not 6 extra months');
 await expect(note).toContainText('Skipping keeps your current benefit');
 await expect(page.getByTestId('event-scale')).toBeVisible();
 await page.screenshot({path:'docs/screenshots/cold2/hiring-fair-renewal.png'});
 await page.getByTestId('event-choice-commit').click();await expect(note).toHaveCount(0);
 expect(await page.evaluate(async()=>{
 // @ts-expect-error dev browser source import
 const {useStore}=await import('/src/ui/store.ts');return useStore.getState().state.flags.hiringFairUntil;
 })).toBe(42);
});

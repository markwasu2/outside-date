import {test,expect} from '@playwright/test';
test('rent seasoning and lender retest explain their clocks without opening permits',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);s.month=40;s.halls.forEach((h:{delivered:boolean})=>h.delivered=true);s.debt.converted=true;s.flags.conversionMonth=40;useStore.setState({state:s,draft:s});
 });
 const cue=page.getByTestId('next-step-card');await expect(cue).toContainText('Let the rent season before closing');await cue.getByRole('button',{name:'Why wait?',exact:true}).click();await expect(cue).toContainText('rent must season until');await expect(page.getByTestId('map-popover')).toHaveCount(0);await page.screenshot({path:'docs/screenshots/cold2/rent-seasoning-clock.png'});
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);s.debt.converted=false;useStore.setState({state:s,draft:s});
 });
 await expect(cue).toContainText('Wait for the lender retest');await cue.getByRole('button',{name:'Why wait?',exact:true}).click();await expect(cue).toContainText('lender retests income');await page.screenshot({path:'docs/screenshots/cold2/lender-retest-clock.png'});
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);s.phase='takeoutAvailable';useStore.setState({state:s,draft:s});
 });
 await cue.getByRole('button',{name:'Show me',exact:true}).click();await expect(page.getByTestId('map-popover').getByRole('button',{name:/^Price the takeout/})).toBeEnabled();
});

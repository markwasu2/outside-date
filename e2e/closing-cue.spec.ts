import {test,expect} from '@playwright/test';
test('finished campus cue explains seasoning then opens the exact takeout action',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=useStore.getState();const next=structuredClone(s.state);next.halls.forEach((h:{delivered:boolean})=>h.delivered=true);next.debt.converted=true;next.flags.conversionMonth=next.month;useStore.setState({state:next,draft:next});
 });
 await expect(page.getByTestId('next-step-card')).toContainText('Let the rent season before closing');
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=useStore.getState();const next={...s.state,phase:'takeoutAvailable'};useStore.setState({state:next,draft:next});
 });
 await expect(page.getByTestId('next-step-card')).toContainText('Price the finished campus');await page.getByTestId('next-step-show-me').click();
 const popup=page.getByTestId('map-popover');await expect(popup.getByRole('button',{name:'Insurance & lender',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(popup.getByTestId('popover-action').filter({hasText:'Price the takeout'})).toBeEnabled();
 await page.screenshot({path:'docs/screenshots/cold2/closing-map-cue.png'});
});

import {test,expect} from '@playwright/test';
test('capital quote shows closing date and upfront equity fee even when low cash blocks it',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);s.month=38;s.cash=1000000;useStore.setState({state:s,draft:s});
 });
 await page.getByRole('button',{name:'Site office',exact:true}).click();await page.getByRole('button',{name:'Raise capital',exact:true}).click();
 const equity=page.getByTestId('popover-action').filter({hasText:'Equity call'});await expect(equity).toBeDisabled();
 await expect(equity).toContainText('cash arrives Y4 M5, not today');await expect(equity).toContainText('cash fee now');
 const bridge=page.getByTestId('popover-action').filter({hasText:'Sponsor bridge loan'});await expect(bridge).toContainText('cash arrives Y4 M4, not today');
 await page.screenshot({path:'docs/screenshots/cold2/capital-arrival-quote.png'});
});

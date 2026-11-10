import {test,expect} from '@playwright/test';
test('a crate due this month is not called unpaid before its delivery tick',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState();const s=structuredClone(store.state);s.month=24;s.power.orders=[{kind:'transformer',orderedMonth:0,arrivalMonth:24,arrived:false,deposit:8_000_000,price:40_000_000,supplier:'standard'}];useStore.setState({state:s,draft:s});
 });
 const crate=page.getByTestId('crate-transformer-standard');await expect(crate).toContainText('due this month');await expect(crate).not.toContainText('slot lost');await expect(crate).toHaveAttribute('title',/End month attempts delivery/);
 await page.locator('[data-campus-object="laydownYard"]').click();await expect(page.getByTestId('map-popover')).toContainText('due this month; End month attempts delivery');await page.screenshot({path:'docs/screenshots/cold2/crate-due-month.png'});await page.getByTestId('map-popover').getByRole('button',{name:'Close',exact:true}).click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState();const s={...store.state,month:25};useStore.setState({state:s,draft:s});
 });
 await expect(crate).toContainText('slot lost in 2mo');await expect(crate).toHaveAttribute('title',/balance unpaid/);await page.locator('[data-campus-object="laydownYard"]').click();await expect(page.getByTestId('map-popover')).toContainText('balance unpaid; check funding');await page.screenshot({path:'docs/screenshots/cold2/crate-balance-unpaid.png'});
});

import {test,expect} from '@playwright/test';
test('switchgear alternative shows a lead range before committing',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);
 s.markets.equipmentIndex=1.5;s.power.orders=[{kind:'switchgear',supplier:'standard',orderedMonth:0,arrivalMonth:30,arrived:false,price:100,deposit:20}];
 useStore.setState({state:s,draft:s});
 });
 await page.locator('[data-campus-object="substation"]').click();
 const alt=page.getByTestId('popover-action').filter({hasText:'Second supplier for the switchgear'});
 await expect(alt).toContainText('10-18mo lead');
 await page.getByTestId('map-popover').evaluate(el=>{el.scrollTop=el.scrollHeight;});
 await page.screenshot({path:'docs/screenshots/cold2/second-supplier-lead.png'});
 await alt.click();await expect(page.getByTestId('crate-switchgear-alt')).toBeVisible();
});

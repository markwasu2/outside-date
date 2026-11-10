import {test,expect} from '@playwright/test';

test('cancelling the named second supplier preserves the standard transformer',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState(),s=structuredClone(store.state);
 s.power.studyStatus='done';s.power.orders=[
 {kind:'transformer',orderedMonth:1,arrivalMonth:24,arrived:false,deposit:1000000,price:5000000,supplier:'standard'},
 {kind:'transformer',orderedMonth:2,arrivalMonth:22,arrived:false,deposit:1000000,price:5000000,supplier:'alt'},
 {kind:'switchgear',orderedMonth:1,arrivalMonth:10,arrived:true,deposit:1000000,price:5000000,supplier:'standard'}];
 useStore.setState({state:s,draft:s});
 });
 await page.getByRole('button',{name:'Substation study done',exact:true}).click();
 const popup=page.getByTestId('map-popover');
 await expect(popup.getByRole('button',{name:/^Cancel transformer order/})).toHaveCount(1);
 await expect(popup).toContainText('The standard supplier stays on order.');
 await page.screenshot({path:'docs/screenshots/cold2/cancel-second-supplier.png'});
 await popup.getByRole('button',{name:/^Cancel transformer order \(second supplier\)/}).click();
 await expect(popup.getByRole('button',{name:/^Cancel transformer order \(standard supplier\)/})).toBeVisible();
 await expect(popup.getByRole('button',{name:/^Cancel transformer order \(second supplier\)/})).toHaveCount(0);
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:/^Laydown yard/}).click();
 await expect(page.getByTestId('map-popover')).not.toContainText('transformer (2nd)');
});

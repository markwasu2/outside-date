import {test,expect} from '@playwright/test';
test('termination loss explains its terminal cause, not the later conversion warning',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);
 s.month=37;s.phase='ended';s.outcome={kind:'lose',reason:'allTerminated'};s.takeout=null;s.halls.forEach((h:{terminated:boolean})=>h.terminated=true);
 s.log=[{month:37,kind:'warning',text:'H4 missed its outside date and was terminated.'},{month:37,kind:'warning',text:'Conversion test failed (DSCR 0.00); interest steps up and is now cash-paid.'},{month:37,kind:'lose',text:'Game over: allTerminated.'}];useStore.setState({state:s,draft:s});
 });
 await expect(page.getByRole('heading',{name:'You lose: Every hall was terminated by the tenant.'})).toBeVisible();
 await expect(page.getByText('Proximate cause: H4 missed its outside date and was terminated.',{exact:true})).toBeVisible();
 await expect(page.getByText(/Proximate cause: Conversion/)).toHaveCount(0);
 await page.screenshot({path:'docs/screenshots/cold2/terminal-loss-cause.png'});
});

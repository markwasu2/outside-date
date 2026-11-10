import {test,expect} from '@playwright/test';
test('yard label and popup match for pending, arrived and installed gear',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 for(const status of ['pending','arrived','installed'] as const){
  await page.evaluate(async(status)=>{
   const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);s.month=24;
   s.power.substationStatus=status==='installed'?'building':'none';
   s.power.orders=status==='installed'?[]:[{kind:'transformer',orderedMonth:0,arrivalMonth:25,arrived:status==='arrived',deposit:0,price:0,supplier:'standard'},{kind:'switchgear',orderedMonth:0,arrivalMonth:25,arrived:status==='arrived',deposit:0,price:0,supplier:'standard'}];
   useStore.setState({state:s,draft:s,plan:[]});
  },status);
  const n=status==='installed'?0:2;await expect(page.getByTestId('yard-capacity')).toHaveText(`${n}/3`);
  await page.locator('[data-campus-object="laydownYard"]').click();await expect(page.getByTestId('yard-popover-capacity')).toHaveText(`${n} of 3 crate slots in use`);
  if(status==='installed')await expect(page.getByTestId('yard-reservation-detail')).toContainText('installed at the substation');
  if(status==='pending')await expect(page.getByTestId('yard-reservation-detail')).toContainText('2 in transit, 0 on site');
  await page.screenshot({path:`docs/screenshots/cold2/yard-${status}-match.png`});await page.getByTestId('map-popover').getByRole('button',{name:'Close',exact:true}).click();
 }
});

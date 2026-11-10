import {expect,test} from '@playwright/test';
test('closeout distinguishes delayed docket from construction slip',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
  (window as unknown as {__debugRunBot:(b:string,s:string,d:string,n:number)=>void}).__debugRunBot('competent','whale','normal',3);
  // @ts-expect-error dev browser source import
  const {useStore}=await import('/src/ui/store.ts');const s=useStore.getState();const next=structuredClone(s.state);
  next.flags.docketApprovedMonth=21;
  next.power.plants.forEach((p:{plannedOnlineMonth:number;onlineMonth:number;slipped:boolean})=>{p.plannedOnlineMonth=45;p.onlineMonth=45;p.slipped=false;});
  next.risks.find((r:{id:string})=>r.id==='plantSlip').materialized=false;
  useStore.setState({state:next,draft:next});
 });
 const skip=page.getByRole('button',{name:'Skip',exact:true});if(await skip.count())await skip.click();
 await expect(page.getByText(/No plant construction slip after docket approval/)).toBeVisible();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.getByTestId('power-timing-closeout')).toContainText('setup estimate Y4 M1; after docket approval Y4 M10; actual Y4 M10');
 await page.screenshot({path:'docs/screenshots/cold2/power-timing-truth.png'});
 await page.evaluate(async()=>{
  // @ts-expect-error dev browser source import
  const {useStore}=await import('/src/ui/store.ts');const s=useStore.getState();const next=structuredClone(s.state);next.power.plants[0].onlineMonth=50;
  useStore.setState({state:next,draft:next});
 });
 await expect(page.getByRole('row').filter({hasText:'Plant construction slip after docket approval'})).toContainText('Yes');
});

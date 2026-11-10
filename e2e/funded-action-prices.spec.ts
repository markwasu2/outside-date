import {test,expect} from '@playwright/test';
test('funded wetlands, feeder and liquid readiness never look free',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');
 // @ts-expect-error dev browser import
 const {createGame}=await import('/src/engine/init.ts');const c=useStore.getState().content;
 const s=createGame(c,'whale',{site:'farmland',hallTier:'hybrid',cooling:'dry',gc:'gmp'},{lease:{firstDeliveryMonth:42,lateRemedy:'liquidatedDamages'},capital:{seniorIndex:0,mezzIndex:0,playerShareIndex:2},power:{minCharge:'high',plantBOffset:0},insurance:{dsu:false}},1);
 s.flags.siteOptioned=true;Object.values(s.permits).forEach((p:{status:string})=>p.status='granted');useStore.setState({state:s,draft:s,plan:[]});
 });
 await page.getByRole('button',{name:/^H1 Not started/}).click();
 const popup=page.getByTestId('map-popover');
 await expect(popup.getByTestId('popover-action').filter({hasText:'Mitigate the wetlands pond'})).toContainText('$6.0M total, from $6.0M equity');
 await page.screenshot({path:'docs/screenshots/cold2/funded-wetlands-price.png'});
 await popup.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:/^H2 Not started/}).click();
 await expect(popup.getByTestId('popover-action').filter({hasText:'Break ground on the far pad'})).toContainText('$250K total, from $250K equity');
 await popup.getByRole('button',{name:'Close',exact:true}).click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);s.halls[1].stageIndex=3;useStore.setState({state:s,draft:s});
 });
 await page.getByRole('button',{name:/^H2 Fit-out/}).click();
 await expect(popup.getByTestId('popover-action').filter({hasText:'Ready liquid cooling'})).toContainText('$9.0M total, from $9.0M equity');
});

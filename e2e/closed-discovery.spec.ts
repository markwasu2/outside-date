import {test,expect} from '@playwright/test';
test('a discovery flag left after approval cannot block an empty wait',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState();const s=structuredClone(store.state);s.month=24;s.cash=500_000_000;s.power.studyStatus='done';s.power.studyDoneMonth=24;s.power.substationStatus='done';s.power.interimGridMW=0;s.debt.seniorDrawn=10_000_000;s.docket.status='approved';s.docket.voteMonth=24;s.docket.discoveryOutstanding=true;s.docket.discoveryDueMonth=24;s.halls.forEach((h:{deliveryMonth:number;outsideMonth:number})=>{h.deliveryMonth=42;h.outsideMonth=48;});s.power.plants.forEach((p:{plannedOnlineMonth:number;onlineMonth:null})=>{p.plannedOnlineMonth=30;p.onlineMonth=null;});useStore.setState({state:s,draft:s,content:{...store.content,events:[]}});
 });
 await page.locator('[data-campus-object="siteOffice"]').click();const popup=page.getByTestId('map-popover');await expect(popup.getByTestId('popover-action').filter({hasText:'Answer discovery'})).not.toBeVisible();
 await popup.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'⏩ Fast forward',exact:true}).click();await expect(page.getByTestId('campus-status')).toContainText('Y3 M6');
 await expect(page.locator('footer')).not.toContainText('discovery response');await page.screenshot({path:'docs/screenshots/cold2/closed-discovery.png'});
});

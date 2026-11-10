import {test,expect} from '@playwright/test';
test('Fast forward advances an empty pre-rent plant wait and stops before its live milestone',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
  const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);s.month=24;s.cash=500_000_000;
  s.power.studyStatus='done';s.power.studyDoneMonth=24;s.power.substationStatus='done';s.power.interimGridMW=0;s.debt.seniorDrawn=10_000_000;
  s.docket.status='approved';s.docket.voteMonth=24;s.flags.siteOptioned=true;
  for(const p of Object.values(s.permits))p.status='granted';
  s.halls.forEach(h=>{h.deliveryMonth=42;h.outsideMonth=48;h.stageIndex=4;h.stageActive=false;h.energized=false;});
  s.power.plants.forEach(p=>{p.plannedOnlineMonth=30;p.onlineMonth=null;});
  const c={...useStore.getState().content,events:[]};useStore.setState({state:s,draft:s,content:c,plan:[]});
 });
 await expect(page.getByTestId('campus-status')).toContainText('Y3 M1');
 await page.getByRole('button',{name:'Postures',exact:true}).click();
 await page.getByTestId('fast-forward-jump').click();
 await expect(page.getByTestId('campus-status')).toContainText('Y3 M6');
 await page.getByTestId('fast-forward-jump').click();await expect(page.locator('footer')).toContainText('Plant A online');
 await page.screenshot({path:'docs/screenshots/cold2/plant-wait-forward.png'});
});

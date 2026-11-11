import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('power footer names booked clocks instead of asking for equipment already ordered',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.evaluate(async()=>{
 // @ts-expect-error browser fixture
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.flags.siteOptioned=true;s.halls[0].stageIndex=4;s.month=10;s.power.studyStatus='done';s.power.orders=[{kind:'switchgear',supplier:'standard',orderedMonth:0,arrivalMonth:14,price:100,deposit:25,arrived:false}];useStore.setState({state:s,draft:s,plan:[]});
 });const footer=page.getByTestId('simple-feedback');await expect(footer).toContainText('Electrical equipment due month 15');await expect(footer).not.toContainText('Waiting alone will not order');await page.screenshot({path:'/tmp/power-wait-booked.png'});
 await page.evaluate(async()=>{
 // @ts-expect-error browser fixture
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.power.substationStatus='building';s.power.substationDoneMonth=16;useStore.setState({state:s,draft:s});
 });await expect(footer).toContainText('due month 17');await expect(footer).toContainText('no separate build order');await page.screenshot({path:'/tmp/power-wait-automatic.png'});
 await page.evaluate(async()=>{
 // @ts-expect-error browser fixture
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.power.substationStatus='none';s.power.orders=[];useStore.setState({state:s,draft:s});
 });await expect(footer).toContainText('order electrical equipment');await expect(footer).toContainText('Waiting alone will not order');
 await page.evaluate(async()=>{
 // @ts-expect-error browser fixture
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.power.substationStatus='done';s.power.interimGridMW=0;s.power.plants[0].plannedOnlineMonth=20;s.power.plants[0].onlineMonth=25;s.power.plants[0].slipped=true;useStore.setState({state:s,draft:s});
 });await expect(footer).toContainText('Plant A is scheduled for month 26');await expect(footer).toContainText('dates can slip');await page.screenshot({path:'/tmp/power-wait-plant.png'});
});

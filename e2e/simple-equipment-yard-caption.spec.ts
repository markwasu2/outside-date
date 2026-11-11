import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
for(const width of [1280,1440])test(`ordered equipment stays clear of the cooling yard at desktop ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===1280?720:900});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.evaluate(async()=>{
 // @ts-expect-error fixture
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.flags.siteOptioned=true;s.halls[0].stageIndex=4;s.month=10;s.power.studyStatus='done';s.power.orders=[{kind:'transformer',supplier:'standard',orderedMonth:0,arrivalMonth:11,price:100,deposit:25,arrived:false},{kind:'switchgear',supplier:'standard',orderedMonth:0,arrivalMonth:8,price:100,deposit:25,arrived:true}];useStore.setState({state:s,draft:s,plan:[]});
 });const support=page.getByTestId('support-yard');await page.screenshot({path:`/tmp/equipment-yard-${width}.png`});const a=await page.getByTestId('simple-yard-summary').boundingBox(),b=await support.boundingBox();expect(a&&b).toBeTruthy();expect(a!.y+a!.height).toBeLessThan(b!.y);await page.getByTestId('simple-yard-summary').click();await expect(page.getByRole('dialog',{name:'Equipment deliveries'})).toBeVisible();await expect(page.getByTestId('simple-object-panel')).toContainText('arrives month 12');await page.getByTestId('simple-object-panel').getByRole('button',{name:'Close',exact:true}).click();
 for(const status of ['due','late','arrived']){await page.evaluate(async(status)=>{
 // @ts-expect-error fixture
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.month=status==='late'?12:11;if(status==='arrived')s.power.orders.forEach(o=>o.arrived=true);useStore.setState({state:s,draft:s});
 },status);await expect(page.getByTestId('simple-yard-summary')).toContainText(status==='due'?'due now':status==='late'?'check delivery':'on site');}

});

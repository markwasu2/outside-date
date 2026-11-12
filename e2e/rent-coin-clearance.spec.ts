import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
for(const width of [1280,1440])test(`rent coins stay beside their building at desktop ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===1280?720:900});await page.addInitScript(()=>{localStorage.setItem('outside-date-detailed','true');Math.random=()=>.123456789;});await page.goto('/');await page.locator('select').first().selectOption('whale');await page.getByRole('button',{name:'New game',exact:true}).click();for(let step=0;step<8;step++)await page.getByRole('button',{name:/^Next:/}).click();await page.getByRole('button',{name:'Review closing table',exact:true}).click();await page.getByRole('button',{name:'Start campaign',exact:true}).click();await page.getByRole('button',{name:'Simple view',exact:true}).click();
 await page.evaluate(async()=>{
 // @ts-expect-error committed-rent visual fixture
 const {useStore}=await import('/src/ui/store.ts');const prev=structuredClone(useStore.getState().state);prev.flags.siteOptioned=true;for(const hall of prev.halls){hall.stageIndex=5;hall.stageActive=false;hall.delivered=true;hall.deliveredMonth=0;hall.energized=true;}const now=structuredClone(prev);now.month++;useStore.setState({prevState:prev,state:now,draft:now,plan:[]});
 });
 const coins=page.locator('[style*="boardCoinFly"]');await expect(coins).toHaveCount(12);
 for(const time of [850,0,180,500,1000,1240]){
 await coins.evaluateAll((els,time)=>{for(const el of els)for(const a of el.getAnimations()){a.pause();a.currentTime=time;}},time);
 if(time===500)await page.screenshot({path:`/tmp/rent-coins-${width}-day.png`});
 for(const coin of await coins.all()){const box=await coin.boundingBox(),art=await coin.locator('xpath=ancestor::*[@data-testid="hall-art-frame"]').boundingBox();expect(box&&art).toBeTruthy();expect(box!.y).toBeGreaterThanOrEqual(art!.y);expect(box!.x+box!.width).toBeLessThanOrEqual(art!.x+art!.width);}
 }
 await coins.evaluateAll(els=>{for(const el of els)for(const a of el.getAnimations())a.currentTime=500;});await page.getByTestId('night-view').click();await page.screenshot({path:`/tmp/rent-coins-${width}-night.png`});await page.emulateMedia({reducedMotion:'reduce'});await expect(coins).toHaveCount(0);
});

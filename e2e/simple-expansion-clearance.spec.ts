import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
for(const width of [1280,1440])for(const count of [-2,-1,0,1,2])test(`${count+4}-hall simple campus keeps buildings inside the roads at desktop ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===1280?720:900});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.evaluate(async(count)=>{
 // @ts-expect-error fixture
 const {useStore}=await import('/src/ui/store.ts');
 // @ts-expect-error fixture
 const {createGame}=await import('/src/engine/init.ts');
 // @ts-expect-error fixture
 const {applyEffect}=await import('/src/engine/effects.ts');
 // @ts-expect-error fixture
 const {DEFAULT_SETUP,DEFAULT_NEGOTIATION}=await import('/src/ui/defaultGame.ts');
 const content=useStore.getState().content;let s=createGame(content,'whale',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);if(count>0)s=applyEffect(s,{type:'addAskHalls',args:[count]},content);else s.halls=s.halls.slice(0,count+4);s.month=48;s.flags.siteOptioned=true;s.power.substationStatus='done';Object.values(s.permits).forEach(p=>p.status='granted');s.halls.forEach((h,i)=>{h.stageIndex=i===s.halls.length-1?1:5;h.stageActive=false;h.delivered=i<s.halls.length-1;h.energized=true;});useStore.setState({state:s,draft:s,plan:[]});
 },count);const map=await page.getByTestId('map-root').boundingBox();expect(map).toBeTruthy();for(let i=1;i<=count+4;i++){const hall=page.locator(`[data-hall-id="H${i}"]`),box=await hall.boundingBox();expect(box).toBeTruthy();expect(box!.x).toBeGreaterThan(map!.x+map!.width*.165);expect(box!.x+box!.width).toBeLessThan(map!.x+map!.width*.595);expect(box!.y+box!.height).toBeLessThan(map!.y+map!.height*.735);await expect(hall).toHaveCSS('z-index','3');const art=await hall.getByTestId('hall-art-frame').boundingBox();expect(art!.y+art!.height).toBeLessThan(map!.y+map!.height*.735);if(i<count+4)await expect(page.locator(`[data-map-control="H${i}"]`)).toHaveCount(0);}
 await page.locator('[data-hall-id="H1"]').click();await expect(page.getByRole('dialog',{name:'H1 · open for rent'})).toBeVisible();await page.getByTestId('simple-object-panel').getByRole('button',{name:'Close',exact:true}).click();const last=page.locator(`[data-map-control="H${count+4}"] button`);await expect(last).toContainText('Build frame');await last.click();await expect(last).toHaveText('Inspect');await last.click();await expect(page.getByTestId('active-work-explanation')).toBeVisible();await page.getByTestId('simple-object-panel').getByRole('button',{name:'Close',exact:true}).click();await page.screenshot({path:`/tmp/expansion-clearance-${count+4}-${width}.png`});
});

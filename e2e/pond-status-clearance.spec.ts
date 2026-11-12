import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
for(const width of [1280,1440])test(`pond status remains readable inside the viewport at desktop ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===1280?720:900});await page.goto('/');await page.getByRole('button',{name:'Custom campus',exact:true}).click();await page.getByTestId('site-card-edge5-meadow').click();for(let i=0;i<8;i++)await page.getByRole('button',{name:/^Next:/}).click();await page.getByRole('button',{name:'Review closing table',exact:true}).click();await page.getByRole('button',{name:'Start campaign',exact:true}).click();await page.locator('[data-map-control=road] button').click();
 for(const words of ['needs wetlands permit','mitigation underway','blocks one hall pad']){
 if(words!=='needs wetlands permit')await page.evaluate(async words=>{
 // @ts-expect-error pond status geometry fixture
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.permits.wetlands.status='granted';s.halls[0].pondBlocked=true;if(words==='mitigation underway')s.flags.pondMitigationDoneMonth=s.month+2;else delete s.flags.pondMitigationDoneMonth;useStore.setState({state:s,draft:s,plan:[]});
 },words);
 const label=page.getByTestId('map-pond-slot').getByText(words,{exact:true});await expect(label).toBeVisible();const box=await label.boundingBox();expect(box).not.toBeNull();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);expect(await label.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);if(words==='needs wetlands permit')await page.screenshot({path:`/tmp/pond-status-${width}-day.png`});
 }await page.getByTestId('night-view').click();await page.screenshot({path:`/tmp/pond-status-${width}-night.png`});
});

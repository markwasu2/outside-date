import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
for(const width of [1280,1440])test(`gatehouse retains upright walls and a human-size entrance at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===1280?720:900});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.evaluate(async()=>{
 // @ts-expect-error fixture
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.flags.siteOptioned=true;s.halls[0].stageIndex=5;s.halls[0].delivered=true;useStore.setState({state:s,draft:s,plan:[]});
 });await page.emulateMedia({reducedMotion:'reduce'});
 for(const size of [{width,height:width===1280?720:900},{width:width===1280?1440:1280,height:width===1280?900:720}]){
  await page.setViewportSize(size);const trees=page.getByTestId('upright-entry-gatehouse');await expect(trees).toHaveCount(1);for(const tree of await trees.all()){await expect.poll(async()=>tree.evaluate(el=>{const m=(el as SVGGraphicsElement).getScreenCTM()!;return Math.abs(Math.hypot(m.a,m.b)/Math.hypot(m.c,m.d)-1);})).toBeLessThan(.01);expect(await tree.evaluate(el=>{const body=new DOMPoint(202,561).matrixTransform((el as SVGGraphicsElement).getScreenCTM()!);const ground=new DOMPoint(202,561).matrixTransform((el.parentElement as unknown as SVGGraphicsElement).getScreenCTM()!);return Math.hypot(body.x-ground.x,body.y-ground.y);})).toBeLessThan(.01);}
  const door=await page.getByTestId('gatehouse-human-door').boundingBox(),human=await page.getByTestId('upright-campus-visitor').first().boundingBox();expect(door&&human).toBeTruthy();expect(door!.height/human!.height).toBeGreaterThan(1.15);expect(door!.height/human!.height).toBeLessThan(1.8);await page.screenshot({path:`/tmp/gatehouse-${size.width}-day.png`});await page.getByTestId('night-view').click();await page.screenshot({path:`/tmp/gatehouse-${size.width}-night.png`});await page.getByTestId('night-view').click();
 }
});

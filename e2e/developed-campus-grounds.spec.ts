import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
for(const count of [1,4,6])test(`${count}-hall developed grounds stay below building art and roads`,async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();
 await expect(page.getByTestId('campus-grounds-layer')).toHaveCount(0);
 await page.evaluate(async count=>{
 // @ts-expect-error visual fixture
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.flags.siteOptioned=true;while(s.halls.length<count)s.halls.push({...structuredClone(s.halls[0]),id:`H${s.halls.length+1}`});s.halls.forEach((h:{stageIndex:number;delivered:boolean;energized:boolean})=>{h.stageIndex=5;h.delivered=true;h.energized=true;});useStore.setState({state:s,draft:s,plan:[]});
 },count);
 const layer=page.getByTestId('campus-grounds-layer');await expect(layer).toBeVisible();await expect(layer).toHaveCSS('z-index','0');await expect(layer).toHaveCSS('pointer-events','none');await expect(page.getByTestId('campus-compound')).toHaveCSS('z-index','2');await expect(layer.locator('pattern path')).toHaveAttribute('fill','none');await expect(page.locator('[data-hall-id]')).toHaveCount(count);
 await page.screenshot({path:`/tmp/developed-grounds-${count}-day.png`});await page.getByRole('button',{name:'Night view',exact:true}).click();await expect(layer).toHaveCSS('filter','brightness(0.6) saturate(0.8)');await page.screenshot({path:`/tmp/developed-grounds-${count}-night.png`});
});

import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
for(const count of [4,6])test(`${count}-hall closing summary fits a 720px desktop`,async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.evaluate(async(count)=>{
 // @ts-expect-error browser fixture
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.halls=Array.from({length:count},(_,i)=>({...structuredClone(s.halls[0]),id:`H${i+1}`,stageIndex:4,delivered:true,stageActive:false}));s.phase='ended';s.outcome={kind:'lose',reason:'equityWiped'};useStore.setState({state:s,draft:s,screen:'reportCard',plan:[]});
 },count);await expect(page.getByTestId('result-hall')).toHaveCount(count);await expect(page.getByRole('button',{name:'Play again',exact:true})).toBeInViewport();expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(720);await page.getByTestId('result-campus').locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>(img as HTMLImageElement).decode())));await page.screenshot({path:`/tmp/closing-${count}-hall-fit.png`});
});

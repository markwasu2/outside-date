import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
for(const position of ['empty','frame','terminated'] as const)test(`closing campus preserves ${position} instead of showing an invented finished building`,async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.evaluate(async position=>{
 // @ts-expect-error test browser import
 const {useStore}=await import('/src/ui/store.ts');
 const s=structuredClone(useStore.getState().draft);s.outcome={kind:'lose',reason:position==='terminated'?'allTerminated':'default'};s.phase='ended';s.cash=-100;s.month=11;
 if(position!=='empty'){s.halls[0].stageIndex=1;s.halls[0].stageMonthsDone=1;s.halls[0].stageActive=true;s.halls[0].terminated=position==='terminated';}
 useStore.setState({state:s,draft:s,screen:'reportCard',plan:[]});
 },position);
 const scene=page.getByTestId('result-campus');await expect(page.getByTestId('simple-result')).toBeVisible();await expect(scene).toContainText('SITE AT CLOSE');await expect(scene).toContainText('Power not connected');await expect(scene).not.toContainText('CAMPUS SOLD');await expect(page.getByTestId('result-power-art')).toHaveCount(0);await expect(scene.getByTestId('stage-vehicle')).toHaveCount(0);await expect(scene.getByTestId('hall-art-frame')).toHaveCount(1);await expect(scene.getByTestId('result-hall')).toHaveAttribute('data-stage',position==='empty'?'notStarted':'steel');
 if(position==='empty')await expect(scene).toContainText('No foundation started');else await expect(scene.getByTestId('hall-growth')).toHaveAttribute('data-progress','0.500');
 if(position==='terminated')await expect(scene).toContainText('Tenant left');
 await scene.locator('img').evaluateAll(images=>Promise.all(images.map(img=>(img as HTMLImageElement).decode())));await page.screenshot({path:`/tmp/final-campus-${position}.png`});await expect(page.getByRole('button',{name:'Play again',exact:true})).toBeInViewport();
 await page.getByRole('button',{name:'Full report',exact:true}).click();await page.getByRole('button',{name:'Back to summary',exact:true}).click();await expect(scene).toBeVisible();
});

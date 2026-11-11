import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('a small investor loss never rounds to apparent break-even and the full report can return to the summary',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.evaluate(async()=>{
 // @ts-expect-error test browser import
 const {useStore}=await import('/src/ui/store.ts');
 // @ts-expect-error test browser import
 const {priceTakeout}=await import('/src/engine/systems/takeout.ts');
 const {content}=useStore.getState(),s=structuredClone(useStore.getState().draft);s.halls[0].delivered=true;s.halls[0].deliveredMonth=0;s.halls[0].energized=true;s.halls[0].stageIndex=5;s.phase='takeoutAvailable';const priced=priceTakeout(s,content);s.equity.calledTotal=priced.takeout!.equityValue/.996;const result=priceTakeout(s,content);useStore.setState({state:result,draft:result});
 });
 const summary=page.getByTestId('simple-result');await expect(summary).toContainText('just under 1.00×');await expect(summary).toContainText('recovered less than they invested');await expect(summary).not.toContainText('Return on owners\' investment1.00×');await page.screenshot({path:'/tmp/simple-sale-small-loss.png'});await page.getByRole('button',{name:'Full report',exact:true}).click();await expect(page.getByRole('button',{name:'Back to summary',exact:true})).toBeVisible();await page.getByRole('button',{name:'Back to summary',exact:true}).click();await expect(summary).toContainText('just under 1.00×');await page.getByRole('button',{name:'Play again',exact:true}).click();await expect(page.getByTestId('start-first-campus')).toBeVisible();
});

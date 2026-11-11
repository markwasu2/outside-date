import {test,expect} from '@playwright/test';
test('six halls retain canvas width at 800px and review opens without shrinking the campus',async({page})=>{
 await page.setViewportSize({width:800,height:900});await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev source import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);
 for(let i=4;i<6;i++)s.halls.push({...structuredClone(s.halls[0]),id:`H${i+1}`});
 s.halls.forEach((h:{stageIndex:number;stageActive:boolean;stageMonthsDone:number},i:number)=>{h.stageIndex=i%4;h.stageActive=true;h.stageMonthsDone=1;});useStore.setState({state:s,draft:s});
 });
 const root=page.getByTestId('map-root');expect((await root.boundingBox())!.width).toBeGreaterThan(780);
 await expect(page.getByTestId('compact-review-toggle')).toHaveAttribute('aria-expanded','false');
 for(let i=1;i<=6;i++)await expect(page.getByTestId(`caption-H${i}`)).toBeInViewport();
 await page.screenshot({path:'/tmp/month-review/six-halls-800.png'});
 await page.getByTestId('compact-review-toggle').click();await expect(page.getByTestId('review-body')).toBeVisible();
 expect((await root.boundingBox())!.width).toBeGreaterThan(780);
 await page.screenshot({path:'/tmp/month-review/review-open-800.png'});
 await page.getByTestId('review-option').first().click();await expect(page.getByTestId('map-popover')).toBeVisible();
 await expect(page.getByTestId('compact-review-toggle')).toHaveAttribute('aria-expanded','false');
 await page.getByTestId('map-popover').getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Month review',exact:true}).click();await expect(page.getByTestId('month-review')).toHaveCount(0);
 await page.getByRole('button',{name:'Month review',exact:true}).click();await expect(page.getByTestId('compact-review-toggle')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(800);
});

test('a narrow first-time player can act, end the month and open its review',async({page})=>{
 await page.setViewportSize({width:800,height:720});await page.goto('/');await page.getByRole('button',{name:'Tutorial',exact:true}).click();await page.getByTestId('cold-intro-dismiss').click();
 await page.getByTestId('compact-review-toggle').click();await page.getByTestId('review-option').first().click();
 const popup=page.getByTestId('map-popover');await popup.getByTestId('popover-action').filter({hasText:'Commission the interconnection study'}).click();await popup.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'End month',exact:true}).click();
 await expect(page.getByTestId('compact-review-toggle')).toContainText('Y1 M2 review');await page.getByTestId('compact-review-toggle').click();
 await expect(page.getByTestId('review-cash')).toBeVisible();
 await page.screenshot({path:'/tmp/month-review/narrow-month-review.png'});
 await page.getByTestId('compact-review-toggle').click();await expect(page.getByTestId('review-body')).toBeHidden();
 await expect(page.getByRole('button',{name:'End month',exact:true})).toBeInViewport();
});

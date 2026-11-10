import {test,expect} from '@playwright/test';

test('docket loss preserves both failed votes instead of ranking unrelated recent events',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState(),s=structuredClone(store.state);
 s.month=20;s.phase='ended';s.outcome={kind:'lose',reason:'docketDead'};s.docket.status='dead';s.docket.failCount=2;s.log=[
 {month:14,kind:'warning',text:'The power docket failed its vote.'},
 ...Array.from({length:6},(_,i)=>({month:15+i,kind:'action',text:'Visited the town.'})),
 {month:20,kind:'warning',text:'The power docket failed its vote.'},
 {month:20,kind:'event',text:'The lender flags a draw.'},
 {month:20,kind:'lose',text:'Game over: docketDead.'}];useStore.setState({state:s,draft:s,screen:'ended'});
 });
 const trail=page.getByTestId('docket-failure-trail');await expect(trail).toContainText('The docket failed 2 votes');await expect(trail).toContainText('[Y2 M3]');await expect(trail).toContainText('[Y2 M9]');
 await expect(page.getByRole('heading',{name:'Recent campaign activity'})).toBeVisible();await expect(page.getByRole('heading',{name:'5 most consequential decisions'})).toHaveCount(0);
 await page.screenshot({path:'docs/screenshots/cold2/docket-loss-trail.png'});
});

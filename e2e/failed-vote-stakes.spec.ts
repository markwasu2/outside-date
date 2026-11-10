import {test,expect} from '@playwright/test';

test('failed-vote alternatives expose their cost, timing and meeting tradeoff',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState(),s=structuredClone(store.state);
 s.docket.status='failedOnce';s.docket.failCount=1;s.docket.voteMonth=s.month;s.phase='awaitingChoice';s.pending={cardId:'docketVoteFail',choices:[{id:'appeal',label:'Appeal the decision'},{id:'redesign',label:'Redesign and refile'}]};useStore.setState({state:s,draft:s});
 });
 const appeal=page.getByTestId('event-choice').filter({hasText:'Appeal the decision'}),redesign=page.getByTestId('event-choice').filter({hasText:'Redesign and refile'});
 await expect(appeal).toContainText('No cash cost; vote +6 months, odds bonus +10 percentage points');await expect(appeal).toContainText('Existing meetings stay settled');
 await expect(redesign).toContainText('Costs $15.0M; vote +4 months, odds bonus +5 percentage points');await expect(redesign).toContainText('All intervenors reopen');
 await expect(page.getByTestId('failed-vote-warning')).toContainText('If the next vote fails, the docket dies');
 await page.screenshot({path:'docs/screenshots/cold2/failed-vote-stakes.png'});
 await appeal.click();await expect(page.getByTestId('campus-event-card')).toHaveCount(0);
});

import {test,expect} from '@playwright/test';
test('a cured freeze crossing does not come back and old notices leave with their month',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=useStore.getState();const next=structuredClone(s.state);next.flags.drawFreeze=true;next.log.push({month:next.month,kind:'warning',text:'Draw freeze: lender is holding construction draws'});useStore.setState({state:next,draft:next});
 });
 await expect(page.getByTestId('event-notice')).toHaveCount(0);
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=useStore.getState();const next=structuredClone(s.state);next.flags.drawFreeze=false;useStore.setState({state:next,draft:next});
 });
 await expect(page.getByTestId('event-notice')).toHaveCount(0);
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=useStore.getState();const next=structuredClone(s.state);next.log.push({month:next.month,kind:'event',text:'A current event'});useStore.setState({state:next,draft:next});
 });
 await expect(page.getByTestId('event-notice')).toContainText('A current event');
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=useStore.getState();const next={...s.state,month:s.state.month+1};useStore.setState({state:next,draft:next});
 });
 await expect(page.getByTestId('event-notice')).toHaveCount(0);await page.screenshot({path:'docs/screenshots/cold2/notice-current.png'});
});

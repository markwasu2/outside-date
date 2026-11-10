import {test,expect} from '@playwright/test';
test('late hall notices and their history use the same year-month clock as campus',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState();const s=structuredClone(store.state);s.log.push({month:s.month,kind:'warning',text:'H5 missed its delivery date: liquidated damages cost $2.3M this month.',detail:'Outside date: month 62. Fix by delivering, or ask the tenant to extend.'});useStore.setState({state:s,draft:s});
 });
 await expect(page.getByTestId('event-notice')).toContainText('Tenant deadline: Y6 M3');await expect(page.getByTestId('event-notice')).not.toContainText('month 62');await page.screenshot({path:'docs/screenshots/cold2/tenant-deadline-notice.png'});
 await page.getByRole('button',{name:/Status & guide/}).click();await expect(page.getByTestId('status-drawer')).toContainText('Tenant deadline: Y6 M3');await expect(page.getByTestId('status-drawer')).not.toContainText('month 62');
});

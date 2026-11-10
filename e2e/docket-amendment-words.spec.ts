import {test,expect} from '@playwright/test';
test('amendment decision reads plainly in fast-forward feedback and ledger',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);
 s.month=10;s.permits.docketAmendment.status='pending';s.permits.docketAmendment.decisionMonth=11;
 useStore.setState({state:s,draft:s});
 });
 await page.getByRole('button',{name:'Postures',exact:true}).click();await page.getByTestId('fast-forward-jump').click();
 await expect(page.locator('body')).toContainText('"Docket amendment decision" is due soon');
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');useStore.setState({openPanel:'ledger'});
 });
 await expect(page.getByText('Docket amendment decision',{exact:true})).toBeVisible();
 await expect(page.locator('body')).not.toContainText('docketAmendment');
 await page.screenshot({path:'docs/screenshots/cold2/docket-amendment-words.png'});
});

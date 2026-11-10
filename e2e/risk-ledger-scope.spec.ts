import {test,expect} from '@playwright/test';
test('risk closeout distinguishes unitemized prevention spending from loss records',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(()=>{(window as unknown as {__debugRunBot:(bot:string,scenario:string,difficulty:string,seed:number)=>void}).__debugRunBot('competent','whale','normal',3);});
 const skip=page.getByRole('button',{name:'Skip',exact:true});if(await skip.count())await skip.click();await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=useStore.getState();const next=structuredClone(s.state);next.scriptedDone.push('chip_generation');next.setup.hallTier='air';delete next.flags.chipGenAssetPenalty;useStore.setState({state:next,draft:next});
 });
 await expect(page.getByTestId('risk-ledger-scope')).toContainText('Prevention costs such as rack retrofits');
 const chip=page.getByRole('row').filter({hasText:'Chip generation obsolescence'});await expect(chip).toContainText('Upgrade event occurred');await expect(chip).toContainText('Not itemized here');
 await expect(page.getByRole('row').filter({hasText:'Tenant exit'})).toContainText('Not simulated');await expect(page.locator('body')).not.toContainText('Cut from v1');
 await page.getByTestId('risk-ledger-scope').scrollIntoViewIfNeeded();await page.screenshot({path:'docs/screenshots/cold2/risk-ledger-scope.png'});await chip.scrollIntoViewIfNeeded();await page.screenshot({path:'docs/screenshots/cold2/risk-upgrade-record.png'});
});

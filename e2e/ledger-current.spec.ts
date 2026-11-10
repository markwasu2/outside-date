import {test,expect} from '@playwright/test';
test('ledger lists current obligations, not resolved milestones or invented takeout opening',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev-only source import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);
 s.month=40;s.halls[0].delivered=true;s.halls[1].terminated=true;s.power.studyDoneMonth=4;s.power.studyStatus='done';s.power.substationStatus='done';s.docket.voteMonth=12;s.docket.status='approved';s.debt.converted=true;s.flags.conversionMonth=35;
 useStore.setState({state:s,draft:s,openPanel:'ledger'});
 });
 await expect(page.getByText('Upcoming obligations',{exact:true})).toBeVisible();
 await expect(page.getByText('H1 delivery',{exact:true})).toHaveCount(0);await expect(page.getByText('H2 outside date',{exact:true})).toHaveCount(0);
 await expect(page.getByText('Docket vote',{exact:true})).toHaveCount(0);await expect(page.getByText('Takeout window opens',{exact:true})).toHaveCount(0);
 await expect(page.getByText('Campaign cutoff / latest takeout',{exact:true})).toBeVisible();
 await page.screenshot({path:'docs/screenshots/cold2/ledger-current.png'});
});

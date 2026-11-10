import {test,expect} from '@playwright/test';
test('denied water review can restart from the map cue before construction is blocked',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState();const s=structuredClone(store.state);s.month=8;s.power.studyStatus='pending';s.permitsRequired=['building','water','air'];Object.values(s.permits).forEach((p:{status:string})=>p.status='pending');s.permits.water.status='denied';s.halls[0].stageIndex=0;s.halls[0].stageActive=false;useStore.setState({state:s,draft:s});
 });
 await expect(page.getByTestId('next-step-card')).toContainText('Refile the water permit');
 await page.getByTestId('next-step-card').getByRole('button',{name:'Next: Refile the water permit'}).click();
 await expect(page.getByTestId('next-step-card')).toContainText('Restart this clock now');
 await page.screenshot({path:'docs/screenshots/cold2/denied-permit-cue.png'});
 await page.getByTestId('next-step-show-me').click();const popup=page.getByTestId('map-popover');await expect(popup).toBeVisible();
 await popup.getByRole('button',{name:/^File water permit/}).click();
 await expect(page.getByTestId('next-step-card')).not.toContainText('Refile the water permit');
});

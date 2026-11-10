import {test,expect} from '@playwright/test';
test('approved power and an automatic substation build explain the wait',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=useStore.getState();const next=structuredClone(s.state);next.power.studyStatus='done';next.docketEnabled=true;next.docket.status='approved';next.power.substationStatus='building';next.power.substationDoneMonth=next.month+2;useStore.setState({state:next,draft:next});
 });
 await expect(page.getByTestId('plant-buildout-A')).toContainText('starts next month');
 await page.locator('[data-campus-object="substation"]').click();await expect(page.getByTestId('substation-progress')).toContainText('Equipment installed');
 await page.screenshot({path:'docs/screenshots/cold2/power-progress.png'});
 await page.getByTestId('map-popover').getByRole('button',{name:'Close',exact:true}).click();await page.locator('[data-campus-object="powerPlants"]').click();await expect(page.getByTestId('map-popover')).toContainText('construction starts automatically next month');
});

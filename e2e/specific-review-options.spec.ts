import {test,expect} from '@playwright/test';
test('social option names an available group, opens it without spending, and respects cooldown after a visit',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Tutorial',exact:true}).click();await page.getByTestId('cold-intro-dismiss').click();
 await page.evaluate(async()=>{
 // @ts-expect-error development browser source
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);
 s.flags.rackScheduleConfirmed=true;s.goodwill.town=20;useStore.setState({state:s,draft:s});
 });
 const choice=page.getByRole('button',{name:'Visit town contacts',exact:false});await expect(page.getByTestId('review-options')).toContainText('20 → 24');
 const before=await page.getByTestId('campus-status').innerText();await choice.click();expect(await page.getByTestId('campus-status').innerText()).toBe(before);
 const popup=page.getByTestId('map-popover');await expect(popup.getByTestId('popover-action')).toHaveCount(1);
 await popup.getByTestId('popover-action').click();await expect(page.getByTestId('review-options')).not.toContainText('Visit town contacts');
 await popup.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'End month',exact:true}).click();
 const slider=page.getByTestId('event-scale');if(await slider.count()){await slider.fill('0');await page.getByTestId('event-choice-commit').click();}
 await expect(page.getByTestId('review-developments')).toContainText('Your contact visit added up to 4 goodwill');
});

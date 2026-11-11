import {test,expect} from '@playwright/test';
test('desktop opening explains the long clock and late contacts show closing stakes',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByRole('button',{name:'Tutorial',exact:true}).click();await page.getByTestId('cold-intro-dismiss').click();
 await expect(page.getByTestId('review-options')).toContainText('months and gates the substation');await expect(page.getByTestId('review-options')).not.toContainText('power docket');
 await page.screenshot({path:'/tmp/desktop-opening-context.png'});
 await page.evaluate(async()=>{
 // @ts-expect-error dev-only fixture setup
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);s.month=19;s.halls[0].delivered=true;s.goodwill.utility=0;s.goodwill.town=22;s.debt.converted=true;s.flags.conversionMonth=18;s.flags.rackScheduleConfirmed=true;useStore.setState({state:s,draft:s});
 });
 await expect(page.getByTestId('review-options')).toContainText('Tenant takeout score 20.0 → 20.4');
 await expect(page.getByRole('button',{name:'Visit utility contacts',exact:false})).toHaveCount(0);
 await page.screenshot({path:'/tmp/desktop-late-contact.png'});
 const before=await page.getByTestId('campus-status').innerText();await page.getByRole('button',{name:'Visit tenant contacts',exact:false}).click();expect(await page.getByTestId('campus-status').innerText()).toBe(before);
 const popup=page.getByTestId('map-popover');await expect(popup.getByTestId('contact-purpose')).toContainText('does not move the lease deadline');
 const box=(await popup.boundingBox())!;expect(box.x+box.width).toBeLessThanOrEqual(1280);await expect(popup.getByRole('button',{name:'Close',exact:true})).toBeInViewport();
 await page.screenshot({path:'/tmp/desktop-contact-purpose.png'});
});

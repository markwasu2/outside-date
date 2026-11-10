import {test,expect} from '@playwright/test';
test('last focus point never sends the player into an unaffordable next instruction',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Tutorial',exact:true}).click();
 await page.locator('[data-campus-object="substation"]').click();await page.getByTestId('popover-action').filter({hasText:'Commission the interconnection study'}).click();
 await page.locator('[data-campus-object="siteOffice"]').click();
 for(const name of ['File building permit','File air permit','File water permit'])await page.getByTestId('popover-action').filter({hasText:name}).click();
 await expect(page.getByTestId('actions-remaining')).toContainText('1 of 6');await expect(page.getByTestId('next-step-card')).toContainText('Next: End the month');
 await page.getByTestId('map-popover').getByRole('button',{name:'Close',exact:true}).click();
 await page.getByTestId('next-step-card').getByRole('button',{name:'Next: End the month',exact:true}).click();
 await expect(page.getByTestId('next-step-card')).toContainText('needs 2 focus points; you have 1 left');
 await page.screenshot({path:'docs/screenshots/cold2/focus-affordable-cue.png'});
});

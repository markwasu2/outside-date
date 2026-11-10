import {test,expect} from '@playwright/test';
test('action desk is visible without a tab or search and names each campus location',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Tutorial',exact:true}).click();
 await expect(page.getByTestId('action-desk')).toHaveCount(0);await page.getByRole('button',{name:'Actions',exact:true}).click();const desk=page.getByTestId('action-desk');await expect(desk).toBeVisible();
 const power=desk.locator('section').filter({has:page.getByRole('heading',{name:'Power connection',exact:true})});
 await expect(power).toContainText('Substation · upper right');await expect(power).toContainText('Uses 2 focus points');await expect(power).toContainText('does not give you power immediately');
 await power.getByTestId('action-location').click();await expect(page.getByTestId('map-popover')).toContainText('Substation');
 await page.getByTestId('map-popover').getByRole('button',{name:'Close',exact:true}).click();
 await power.getByTestId('desk-add-action').first().click();await expect(page.getByTestId('actions-remaining')).toHaveText('Focus this month: 4 of 6 left');
 await expect(desk).toContainText('Done this month (1)');await desk.getByTestId('undo-last-action').click();
 await expect(page.getByTestId('actions-remaining')).toHaveText('Focus this month: 6 of 6 left');
 await desk.locator('section').first().scrollIntoViewIfNeeded();
 await page.screenshot({path:'docs/screenshots/cold2/visible-actions-1280.png'});await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'docs/screenshots/cold2/visible-actions-1440.png'});
});

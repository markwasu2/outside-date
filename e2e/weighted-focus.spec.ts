import {test,expect} from '@playwright/test';
test('four unequal instructions fit together and a major task cannot spend the final point',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Tutorial',exact:true}).click();
 await page.getByRole('button',{name:'Actions',exact:true}).click();
 const count=page.getByTestId('actions-remaining');
 await page.locator('[data-campus-object="substation"]').click();
 await page.getByTestId('popover-action').filter({hasText:'Commission the interconnection study'}).click();
 await expect(count).toHaveText('Focus this month: 4 of 6 left');
 await page.getByTestId('map-popover').getByRole('button',{name:'Close',exact:true}).click();
 await page.locator('[data-campus-object="siteOffice"]').click();
 for(const name of ['File air permit','File water permit','File building permit']){
  const row=page.getByTestId('popover-action').filter({hasText:name});await expect(row).toContainText('Uses 1 focus point');await row.click();
 }
 await expect(count).toHaveText('Focus this month: 1 of 6 left');
 await expect(page.getByTestId('action-desk')).toContainText('File a permit: air · 1 focus');
 await expect(page.getByTestId('action-desk')).toContainText('File a permit: water · 1 focus');
 await page.getByTestId('map-popover').getByRole('button',{name:'Close',exact:true}).click();
 await page.locator('[data-campus-object="substation"]').click();
 const order=page.getByTestId('popover-action').filter({hasText:'Order the switchgear'});
 await expect(order).toBeDisabled();await expect(order).toContainText('Uses 2 focus points; only 1 left');
 await page.screenshot({path:'docs/screenshots/cold2/weighted-focus-mixed-plan.png'});
 await page.getByTestId('map-popover').getByRole('button',{name:'Close',exact:true}).click();
 await expect(page.getByTestId('action-desk')).toContainText("This month's plan (4)");
 await page.getByRole('button',{name:'End month',exact:true}).click();await expect(count).toHaveText('Focus this month: 6 of 6 left');
});

import {test,expect} from '@playwright/test';
test('unoptioned hall names the missing land instruction and campus destination',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Tutorial',exact:true}).click();
 await page.locator('[data-campus-object="H1"]').click();
 const row=page.getByTestId('popover-action').filter({hasText:'near pad'});await expect(row).toBeDisabled();
 await expect(row).toContainText('Option the site before starting H1');await expect(row).toContainText('road across the top of campus');
 await page.screenshot({path:'docs/screenshots/cold2/precise-site-prerequisite.png'});
 await page.locator('[data-campus-object="road"]').click();await page.getByTestId('popover-action').filter({hasText:'Option the site'}).click();
 await page.locator('[data-campus-object="H1"]').click();await expect(page.getByTestId('popover-action').filter({hasText:'near pad'})).toBeEnabled();
});

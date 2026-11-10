import {test,expect} from '@playwright/test';
test('object actions stay open, update from the plan and move Next without a month tick',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Tutorial',exact:true}).click();
 await page.locator('[data-campus-object="substation"]').click();
 const popup=page.getByTestId('map-popover');
 await popup.getByTestId('popover-action').filter({hasText:'Commission the interconnection study'}).click();
 await expect(popup).toBeVisible();await expect(popup.getByRole('status')).toContainText('End month to commit');
 await expect(page.getByTestId('campus-status')).toContainText('Y1 M1');
 await expect(page.getByTestId('next-step-card')).toContainText('After planned actions:');
 await expect(page.getByTestId('next-step-card')).not.toContainText('Commission the interconnection study');
 await popup.getByRole('button',{name:'Why unavailable: Commission the interconnection study?',exact:true}).click();
 await expect(popup.getByRole('status')).toContainText('already commissioned');
 await page.screenshot({path:'docs/screenshots/cold2/persistent-actions.png'});
 await popup.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Plan',exact:true}).click();await page.getByRole('button',{name:'remove',exact:true}).click();
 await expect(page.getByTestId('next-step-card')).toContainText('Next: Commission the interconnection study');
});

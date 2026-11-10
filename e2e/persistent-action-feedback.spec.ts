import {test,expect} from '@playwright/test';
test('object actions stay open, update from the plan and move Next without a month tick',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Tutorial',exact:true}).click();
 await page.locator('[data-campus-object="substation"]').click();
 const popup=page.getByTestId('map-popover');
 await popup.getByTestId('popover-action').filter({hasText:'Commission the interconnection study'}).click();
 await expect(popup).toBeVisible();await expect(popup.getByRole('status')).toContainText('Undo is at the bottom');
 await expect(page.getByTestId('campus-status')).toContainText('Y1 M1');
 await expect(page.getByTestId('next-step-card')).toContainText('Next:');
 await expect(page.getByTestId('next-step-card')).not.toContainText('Commission the interconnection study');
 await popup.getByTestId('context-only-actions').locator('summary').click();
 await popup.getByRole('button',{name:'Why unavailable: Commission the interconnection study?',exact:true}).click();
 await expect(popup.getByRole('status')).toContainText('already commissioned');
 await page.screenshot({path:'docs/screenshots/cold2/persistent-actions.png'});
 await popup.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Plan',exact:true}).click();await page.getByTestId('undo-last-action').click();
 await expect(page.getByTestId('next-step-card')).toContainText('Next: Commission the interconnection study');
});

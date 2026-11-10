import {test,expect} from '@playwright/test';
test('completed instructions and irrelevant cures fold away without hiding real blockers',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Tutorial',exact:true}).click();
 await page.locator('[data-campus-object="H1"]').click();const popup=page.getByTestId('map-popover');
 const fix=popup.getByTestId('popover-action').filter({hasText:'Fix inspection'});await expect(fix).not.toBeVisible();
 const ground=popup.getByTestId('popover-action').filter({hasText:'near pad'});await expect(ground).toBeVisible();await expect(ground).toBeDisabled();
 await popup.getByTestId('context-only-actions').locator('summary').click();await expect(fix).toBeVisible();
 await popup.getByRole('button',{name:'Close',exact:true}).click();await page.locator('[data-campus-object="substation"]').click();const study=popup.getByTestId('popover-action').filter({hasText:'Commission the interconnection study'});await study.click();await expect(study).not.toBeVisible();
 await expect(popup.getByRole('status')).toContainText('planned');await expect(popup.getByTestId('popover-action').filter({hasText:'Order the switchgear'})).toBeVisible();
 await page.screenshot({path:'docs/screenshots/cold2/popup-progressive.png'});
});

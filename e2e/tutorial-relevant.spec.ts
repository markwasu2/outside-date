import {test,expect} from '@playwright/test';
test('tutorial never offers waived transformer/docket choices and queued study keeps its true price',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Tutorial',exact:true}).click();await page.getByTestId('next-step-show-me').click();
 const popup=page.getByTestId('map-popover');await expect(popup.getByTestId('popover-action').filter({hasText:'Order the transformer'})).toHaveCount(0);
 const study=popup.getByTestId('popover-action').filter({hasText:'Commission the interconnection study'});await study.click();await expect(study).toContainText('$500K');await expect(study).not.toContainText('$2.0M');
 await page.screenshot({path:'docs/screenshots/cold2/tutorial-relevant-power.png'});
 await page.locator('[data-campus-object="siteOffice"]').click();
 for(const name of ['File the power docket','Prepare testimony','Answer discovery'])await expect(popup.getByTestId('popover-action').filter({hasText:name})).toHaveCount(0);
 await page.screenshot({path:'docs/screenshots/cold2/tutorial-relevant-office.png'});
});

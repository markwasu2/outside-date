import {test,expect} from '@playwright/test';
test('site office explains live vote odds and recurrent discovery',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.locator('[data-campus-object="substation"]').click();await page.getByTestId('popover-action').filter({hasText:'Commission the interconnection study'}).click();
 await page.getByTestId('map-popover').getByRole('button',{name:'Close',exact:true}).click();
 await page.locator('[data-campus-object="siteOffice"]').click();await page.getByTestId('popover-action').filter({hasText:'File the power docket'}).click();
 const brief=page.getByTestId('docket-brief');await expect(brief).toContainText('Vote chance now:');await expect(brief).toContainText('Answers do not end discovery');
 await page.screenshot({path:'docs/screenshots/cold2/docket-odds.png'});
});

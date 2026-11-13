import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
for(const width of [1280,1024])test(`undo clears receipt with earlier orders retained ${width}`,async({page})=>{
 await page.setViewportSize({width,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();
 await page.locator('[data-map-control="road"] button').click();await page.locator('[data-map-control="H1"] button').click();
 await expect(page.getByTestId('build-receipt')).toContainText('Build foundation');
 await page.getByRole('button',{name:'Undo last order',exact:true}).click();
 await page.waitForTimeout(1000);await page.screenshot({path:`/tmp/receipt-undo-after-${width}.png`});
 await expect(page.getByTestId('build-receipt')).toHaveCount(0,{timeout:300});
 await expect(page.locator('[data-map-control="H1"] button')).toContainText('Build foundation');
 await page.locator('[data-map-control="H1"] button').click();
 await expect(page.getByTestId('build-receipt')).toContainText('Build foundation');
 await page.getByRole('button',{name:'Undo last order',exact:true}).click();
 await expect(page.getByTestId('build-receipt')).toHaveCount(0);
 await page.getByRole('button',{name:'Undo last order',exact:true}).click();
 await expect(page.getByTestId('build-receipt')).toHaveCount(0);
 await expect(page.locator('[data-map-control="road"] button')).toContainText('Buy land');
});

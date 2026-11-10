import {test,expect} from '@playwright/test';
test('object popup keeps Close visible after scrolling, reanchors on desk resize and does not swallow switches',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByRole('button',{name:'Tutorial',exact:true}).click();
 await page.locator('[data-campus-object="siteOffice"]').click();const popup=page.getByTestId('map-popover');
 await popup.evaluate(el=>el.scrollTop=el.scrollHeight);const close=popup.getByRole('button',{name:'Close',exact:true});await expect(close).toBeInViewport();
 await page.screenshot({path:'docs/screenshots/cold2/popup-sticky-close.png'});await close.click();await expect(popup).toHaveCount(0);
 await page.locator('[data-campus-object="substation"]').click();await expect(popup).toContainText('Substation');
 await page.getByRole('button',{name:'Actions',exact:true}).click();await expect(popup).toHaveCount(0);
 await page.getByTestId('action-desk').getByTestId('action-location').filter({hasText:'Substation'}).click();await expect(popup).toContainText('Substation');
 const box=await popup.boundingBox();const map=await page.getByTestId('map-root').boundingBox();expect(box!.x+box!.width).toBeLessThanOrEqual(map!.x+map!.width+1);
 await page.getByRole('button',{name:'Actions',exact:true}).click();await expect(popup).toHaveCount(0);
 await page.locator('[data-campus-object="road"]').click();await expect(popup).toContainText('Land & access road');
 await page.locator('[data-campus-object="H1"]').click();await expect(popup).toContainText('H1 (5 MW)');
 await page.getByText('Touch the campus to begin.',{exact:true}).click();await expect(popup).toHaveCount(0);
});

import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('first three months show small wins and real express-versus-standard choices',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();
 await expect(page.getByTestId('milestone-trail')).toContainText('0/8 ready');
 await page.locator('[data-map-control="road"] button').click();
 await expect(page.locator('[data-milestone="land"]')).toHaveAttribute('data-complete','true');await expect(page.getByTestId('build-receipt')).toContainText('Buy land');
 await page.locator('[data-map-control="siteOffice"] button').click();const panel=page.getByTestId('simple-object-panel');await panel.getByRole('button',{name:'Apply for building permit',exact:true}).click();await panel.getByRole('button',{name:'Close',exact:true}).click();
 await page.locator('[data-map-control="substation"] button').click();await panel.getByRole('button',{name:'Start power study',exact:true}).click();
 await expect(panel.getByRole('button',{name:'Express electrical equipment',exact:true})).toBeVisible();await expect(panel).toContainText('More expensive than a standard order');await page.screenshot({path:'/tmp/small-wins-power-choice.png'});
 await panel.getByRole('button',{name:'Close',exact:true}).click();await page.getByTestId('simple-next-month').click();if(await page.getByTestId('event-scale').count()){await page.getByTestId('event-scale').fill('0');await page.getByTestId('event-choice-commit').click();}
 await page.locator('[data-map-control="H1"] button').click();await page.locator('[data-map-control="substation"] button').click();await panel.getByRole('button',{name:'Express electrical equipment',exact:true}).click();await panel.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByTestId('campus-people').click();await expect(panel.getByRole('button',{name:'Meet permit officials',exact:true})).toBeVisible();await expect(panel).toContainText('not construction speed');await panel.getByRole('button',{name:'Meet permit officials',exact:true}).click();await panel.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByTestId('simple-next-month').click();if(await page.getByTestId('event-scale').count()){await page.getByTestId('event-scale').fill('0');await page.getByTestId('event-choice-commit').click();}await expect(page.locator('[data-milestone="foundation"]')).toHaveAttribute('data-complete','true');await expect(page.locator('[data-milestone="permit"]')).toHaveAttribute('data-complete','true');await expect(page.getByTestId('simple-month')).toHaveText('Month 3');await expect(page.locator('[data-map-control="H1"] button')).toContainText('Build frame');await page.screenshot({path:'/tmp/small-wins-month3.png'});
});

import {test,expect} from '@playwright/test';
test('rapid pause and resume keep one simulation clock',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Tutorial',exact:true}).click();await page.clock.install();await page.clock.pauseAt(new Date());const month=page.getByTestId('campus-status').locator('strong').first(),start=await month.innerText(),toggle=page.getByTestId('fast-forward-button');
 await toggle.click();await page.clock.runFor(100);await toggle.click();await page.clock.runFor(50);await toggle.click();await page.clock.runFor(100);await expect(month).toHaveText(start);await page.clock.runFor(150);await expect(month).not.toHaveText(start);await expect(toggle).toContainText('Pause sim');await toggle.click();const stopped=await month.innerText();await page.clock.runFor(1200);await expect(month).toHaveText(stopped);await expect(toggle).toContainText('Run sim');await page.screenshot({path:'/tmp/sim-resume-clock.png'});
});

import {test,expect} from '@playwright/test';
import fs from 'node:fs';
test.use({storageState:{cookies:[],origins:[]}});
test('an unrelated queued order cannot hide stopped construction and repair clears the warning',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.locator('[data-map-control="road"] button').click();await page.locator('[data-map-control="H1"] button').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev fixture import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.flags['inspectionFail:H1']=true;useStore.setState({state:s,draft:s,plan:[],snapshots:[]});useStore.getState().autosave();});
 fs.writeFileSync('/tmp/queued-paused-save.json',await page.evaluate(()=>localStorage.getItem('outside-date-save')!));
 await page.locator('[data-map-control="siteOffice"] button').click();await page.getByTestId('simple-do-action').filter({hasText:'Apply for building permit'}).click();await page.getByTestId('simple-object-panel').getByRole('button',{name:'Close',exact:true}).click();await expect(page.getByTestId('simple-feedback')).toContainText('1 order placed');await expect(page.getByTestId('simple-feedback')).toContainText('A failed inspection stopped work');await expect(page.getByTestId('simple-feedback')).not.toContainText('Crews work when time advances');await expect(page.getByTestId('walking-worker')).toHaveCount(0);await expect(page.getByTestId('ambient-service-truck')).toHaveCount(0);await expect(page.getByTestId('ambient-truck')).toBeVisible();await page.screenshot({path:'/tmp/queued-paused-warning.png'});
 await page.locator('[data-map-control="H1"] button').click();await expect(page.getByTestId('simple-feedback')).not.toContainText('A failed inspection stopped work');await expect(page.getByTestId('simple-feedback')).toContainText('Crews work when time advances');await expect(page.getByTestId('walking-worker')).toHaveCount(4);await expect(page.getByTestId('ambient-service-truck')).toBeVisible();await page.screenshot({path:'/tmp/queued-paused-cleared.png'});
});

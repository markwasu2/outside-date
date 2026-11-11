import {test,expect} from '@playwright/test';
import fs from 'node:fs';
test.use({storageState:{cookies:[],origins:[]}});
test('unaffordable construction stops and explains the active order',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.locator('[data-map-control="road"] button').click();await page.locator('[data-map-control="H1"] button').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev fixture import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.cash=1e6;s.equity.calledTotal=s.equity.committedTotal;s.debt.seniorDrawn=s.debt.seniorCommitment;s.debt.mezzDrawn=s.debt.mezzCommitment;useStore.setState({state:s,draft:s,plan:[],snapshots:[]});useStore.getState().autosave();});
 fs.writeFileSync('/tmp/unfunded-save.json',await page.evaluate(()=>localStorage.getItem('outside-date-save')!));
 await page.getByTestId('simple-next-month').click();await page.getByTestId('event-scale').fill('0');await page.getByTestId('event-choice-commit').click();await expect(page.locator('[data-hall-id="H1"]')).toContainText('Paused - not enough building funds');await expect(page.getByTestId('simple-feedback')).toContainText('Building funds are short');await expect(page.getByTestId('simple-feedback')).not.toContainText('Crews are working');await expect(page.getByTestId('walking-worker')).toHaveCount(0);await expect(page.getByTestId('ambient-service-truck')).toHaveCount(0);await expect(page.getByTestId('ambient-truck')).toBeVisible();await page.screenshot({path:'/tmp/unfunded-after.png'});
 await page.locator('[data-map-control="H1"] button').click();await expect(page.getByTestId('unfunded-work-explanation')).toContainText('Keep the existing build order');await page.screenshot({path:'/tmp/unfunded-panel.png'});await page.getByRole('button',{name:'Inspect Money',exact:true}).click();await expect(page.getByRole('dialog',{name:'Money',exact:true})).toBeVisible();await page.screenshot({path:'/tmp/unfunded-money.png'});
});

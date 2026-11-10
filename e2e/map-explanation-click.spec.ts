import {test,expect} from '@playwright/test';

test('expanded waiting explanation does not intercept the site-office click',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);
 s.month=50;s.halls.forEach((h:{delivered:boolean})=>h.delivered=true);s.debt.converted=false;useStore.setState({state:s,draft:s});
 });
 const cue=page.getByTestId('next-step-card');await expect(cue).toContainText('Wait for the lender retest');
 await page.getByRole('button',{name:'Why wait?',exact:true}).click();
 await expect(page.getByTestId('next-step-explanation')).toContainText('lender retests income');
 await page.screenshot({path:'docs/screenshots/cold2/map-explanation-before-click.png'});
 await page.getByRole('button',{name:'Site office',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Site office actions'})).toBeVisible();
 await expect(page.getByTestId('next-step-explanation')).toHaveCount(0);
 await page.screenshot({path:'docs/screenshots/cold2/map-explanation-office-open.png'});
});

import {test,expect} from '@playwright/test';
test('early order keeps a single booked date across the warning and yard and exposes a supplier lever',async({page})=>{
 await page.goto('/');await page.locator('select').first().selectOption('whale');await page.getByRole('button',{name:'Quick start',exact:true}).click();
 await page.locator('[data-campus-object="substation"]').click();const popup=page.getByTestId('map-popover');
 await popup.getByTestId('popover-action').filter({hasText:'Commission the interconnection study'}).click();
 await popup.getByTestId('popover-action').filter({hasText:'Order the transformer'}).click();
 await page.getByRole('button',{name:'End month',exact:true}).click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const{useStore}=await import('/src/ui/store.ts');const s=useStore.getState();if(s.state.pending)s.resolveEventChoice(s.state.pending.choices[0].id);});
 const crate=page.getByTestId('crate-transformer-standard');const text=await crate.innerText();const date=text.match(/Y\d+ M\d+/)![0];
 await page.getByRole('button',{name:/Status & guide/}).click();const warning=page.getByTestId('warning-warning').filter({hasText:'transformer arrives'});
 await expect(warning).toContainText(date);await expect(warning).toContainText('A second supplier quotes');
 await expect(warning).not.toContainText('No lever');
 await warning.scrollIntoViewIfNeeded();await page.waitForTimeout(800);
 await page.screenshot({path:'docs/screenshots/cold2/equipment-warning.png'});
 // Opening the warning's fix must reveal the object instead of leaving the guide over it.
 await warning.getByRole('button',{name:'Open the substation',exact:true}).click();
 await expect(page.getByTestId('status-drawer')).toHaveCount(0);
 await expect(popup.getByTestId('popover-action').filter({hasText:'Second supplier for the transformer'})).toBeVisible();
 await popup.getByRole('button',{name:'Close',exact:true}).click();await page.locator('[data-campus-object="laydownYard"]').click();
 await expect(popup).toContainText(date);
 await page.screenshot({path:'docs/screenshots/cold2/equipment-yard.png'});
});

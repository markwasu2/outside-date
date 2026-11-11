import {expect,test} from '@playwright/test';
test('typing action search and using focused buttons never triggers global turn shortcuts',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Tutorial',exact:true}).click();
 await page.getByRole('button',{name:'Plan',exact:true}).click();await page.getByRole('button',{name:'Find an action',exact:true}).click();
 await page.getByTestId('action-search').pressSequentially('file permit');
 await expect(page.getByTestId('campus-status')).toContainText('Y1 M1');
 await page.getByRole('button',{name:'Close panel'}).click();
 const end=page.getByRole('button',{name:'End month',exact:true});await end.focus();await page.keyboard.press('Space');
 await expect(page.getByTestId('campus-status')).toContainText('Y1 M2');
 await page.screenshot({path:'docs/screenshots/cold2/safe-month-input.png'});
});
test('double clicking End month commits only one turn',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Tutorial',exact:true}).click();
 await page.getByRole('button',{name:'End month',exact:true}).dblclick();
 await expect(page.getByTestId('campus-status')).toContainText('Y1 M2');
});
test('unfocused Space advances once and a held key does not repeat',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Tutorial',exact:true}).click();
 await page.getByTestId('campus-status').click({position:{x:8,y:8}});await page.keyboard.down('Space');await page.keyboard.down('Space');await page.keyboard.up('Space');
 await expect(page.getByTestId('campus-status')).toContainText('Y1 M2');
});

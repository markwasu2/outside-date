import {test, expect} from '@playwright/test';

for (const [difficulty, site, name] of [['easy','megasite','Richfield Megasite'],['hard','farmland','Oxbow Bend Farmland']]) {
 test(`${difficulty} setup explains and selects the same fixed land as the campus`,async({page})=>{
  await page.goto('/');await page.locator('select').nth(1).selectOption(difficulty!);
  await page.getByRole('button',{name:'New game',exact:true}).click();
  await expect(page.getByTestId('fixed-site-explanation')).toContainText(name!);
  await expect(page.locator('[data-testid^="site-card-"]')).toHaveCount(1);
  await expect(page.getByTestId(`site-card-${site}`)).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('header')).toContainText(name!);
  await page.screenshot({path:`docs/screenshots/cold2/fixed-land-${difficulty}.png`});
  await page.getByRole('button',{name:'Next: Hall tier',exact:true}).click();
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await expect(page.getByTestId(`site-card-${site}`)).toHaveAttribute('aria-pressed','true');
 });
}

test('normal still offers every site and updates the campus on a real selection',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'New game',exact:true}).click();
 await expect(page.locator('[data-testid^="site-card-"]')).toHaveCount(3);
 await expect(page.getByTestId('fixed-site-explanation')).toHaveCount(0);
 await page.getByTestId('site-card-quarry-ridge').click();
 await expect(page.getByTestId('site-card-quarry-ridge')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('header')).toContainText('Quarry Ridge');
});

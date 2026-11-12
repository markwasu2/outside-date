import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
for(const width of [1280,1440])test(`visible game name fits desktop ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===1280?720:900});await page.goto('/');await expect(page).toHaveTitle('Data Center Simulator');
 await page.getByTestId('start-first-campus').click();const header=page.getByTestId('tycoon-game').locator('header');await expect(header).toContainText('Data Center Simulator');await expect(header).not.toContainText('Outside Date');
 const boxes=await header.locator(':scope > *').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));for(let i=1;i<boxes.length;i++)expect(boxes[i].left).toBeGreaterThanOrEqual(boxes[i-1].right-1);expect(boxes.at(-1)!.right).toBeLessThanOrEqual(width);
 await page.screenshot({path:`/tmp/game-name-${width}-simple.png`});await page.getByRole('button',{name:'Detailed view',exact:true}).click();await expect(page.locator('header').first()).toContainText('Data Center Simulator');await page.screenshot({path:`/tmp/game-name-${width}-detailed.png`});
});

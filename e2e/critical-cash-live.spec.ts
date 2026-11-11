import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('critical cash uses the live position and clears when cash actually changes',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();const warning=page.getByTestId('critical-cash-warning');await expect(warning).toHaveCount(0);
 await page.evaluate(async()=>{
 // @ts-expect-error browser fixture import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.cash=500000;useStore.setState({state:s,draft:s});});
 await expect(warning).toContainText('Less than three months');await expect(warning).toBeInViewport();await expect(page.getByTestId('simple-next-month')).toBeInViewport();await page.getByTestId('review-low-cash').click();await expect(page.getByTestId('money-current-position')).toContainText('$500K');await page.getByTestId('simple-object-panel').getByRole('button',{name:'Close',exact:true}).click();
 await page.evaluate(async()=>{
 // @ts-expect-error browser fixture import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.cash=9000000;useStore.setState({state:s,draft:s});});await expect(warning).toHaveCount(0);
});

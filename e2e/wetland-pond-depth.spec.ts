import {test,expect} from '@playwright/test';
test('wetland pond has a curved bank, shaded water and reeds',async({page})=>{
 await page.goto('/');const detail=await page.evaluate(async()=>{const d=new DOMParser().parseFromString(await(await fetch('/src/assets/campus/tile-pond.svg')).text(),'image/svg+xml');const g=d.querySelector('[data-testid="wetland-pond-detail"]');return{groups:d.querySelectorAll('[data-testid="wetland-pond-detail"]').length,curves:g?.querySelectorAll('path[d*=" Q"]').length,water:g?.querySelectorAll('path[fill="url(#pond-water)"]').length,paths:g?.querySelectorAll('path').length};});expect(detail.groups).toBe(1);expect(detail.curves).toBe(4);expect(detail.water).toBe(1);expect(detail.paths).toBeGreaterThan(30);
});

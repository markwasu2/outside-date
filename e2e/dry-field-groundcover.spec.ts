import {test,expect} from '@playwright/test';
test('dry field has soil contours and scattered grass rather than a blank tile',async({page})=>{
 await page.goto('/');const detail=await page.evaluate(async()=>{const d=new DOMParser().parseFromString(await(await fetch('/src/assets/campus/tile-dry-field.svg')).text(),'image/svg+xml');return {error:!!d.querySelector('parsererror'),groups:d.querySelectorAll('[data-testid="dry-field-groundcover"]').length,tufts:d.querySelectorAll('g[transform^="translate"]').length,soil:d.querySelectorAll('path[fill="url(#dry-soil)"]').length};});expect(detail).toEqual({error:false,groups:1,tufts:32,soil:1});
});

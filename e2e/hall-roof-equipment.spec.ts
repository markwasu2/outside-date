import {test,expect} from '@playwright/test';
test('fitted hall roofs have three separate air handlers clear of solar panels',async({page})=>{
 await page.goto('/');const art=await page.evaluate(async()=>{
 // @ts-expect-error source art fixture
 const {STAGE_ART}=await import('/src/ui/art.ts');return Promise.all(Object.entries(STAGE_ART).map(async([stage,look])=>{const d=new DOMParser().parseFromString(await(await fetch(look.img)).text(),'image/svg+xml'),g=d.querySelector('[data-testid="hall-roof-air-handlers"]');return{stage,groups:d.querySelectorAll('[data-testid="hall-roof-air-handlers"]').length,paths:g?.querySelectorAll('path').length,polygons:g?.querySelectorAll('polygon').length};}));
 });for(const a of art){if(['fitout','rfs','delivered'].includes(a.stage)){expect(a.groups).toBe(1);expect(a.paths).toBe(30);expect(a.polygons).toBe(33);}else expect(a.groups).toBe(0);}
});

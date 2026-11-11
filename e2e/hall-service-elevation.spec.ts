import {test,expect} from '@playwright/test';
test('enclosed hall stages retain a service entrance, landing and recessed intake',async({page})=>{
 await page.goto('/');const art=await page.evaluate(async()=>{
 // @ts-expect-error source art fixture
 const {STAGE_ART}=await import('/src/ui/art.ts');return Promise.all(Object.entries(STAGE_ART).map(async([stage,look])=>{const d=new DOMParser().parseFromString(await(await fetch(look.img)).text(),'image/svg+xml'),g=d.querySelector('[data-testid="hall-service-elevation"]');return{stage,groups:d.querySelectorAll('[data-testid="hall-service-elevation"]').length,paths:g?.querySelectorAll('path').length,polygons:g?.querySelectorAll('polygon').length};}));
 });for(const a of art){if(['shell','fitout','rfs','delivered'].includes(a.stage)){expect(a.groups).toBe(1);expect(a.paths).toBeGreaterThanOrEqual(20);expect(a.polygons).toBeGreaterThanOrEqual(10);}else expect(a.groups).toBe(0);}
});

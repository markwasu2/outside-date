import {test,expect} from '@playwright/test';
test('all site terrains retain upright woodland outside the road and building court',async({page})=>{
 await page.goto('/');const scenes=await page.evaluate(async()=>{
 // @ts-expect-error source terrain import
 const {siteTerrain}=await import('/src/ui/board/siteTerrain.ts');const themes=[{ground:'#x',pond:false},{ground:'#x',pond:true},{ground:'#bcaaa4',pond:false},{ground:'#e0d2b0',pond:false}];return Promise.all(themes.map(async t=>{const a=siteTerrain(t);const d=new DOMParser().parseFromString(await(await fetch(a.image)).text(),'image/svg+xml');return{id:a.id,viewBox:d.documentElement.getAttribute('viewBox'),trees:[...d.querySelectorAll('[data-tree]')].map(g=>g.getAttribute('transform')),earthwork:!!d.querySelector('#graded-site-earthwork'),earthworkPasses:d.querySelectorAll('#graded-site-earthwork path').length,hasWoodland:!!d.querySelector('#perimeter-woodland')};}));
 });expect(new Set(scenes.map(s=>s.id)).size).toBe(4);for(const s of scenes){expect(s.hasWoodland).toBe(true);expect(s.earthwork).toBe(true);expect(s.earthworkPasses).toBeGreaterThan(70);expect(s.viewBox).toBe('0 0 1200 800');expect(s.trees.length).toBeGreaterThan(20);expect(s.trees.some(t=>t?.includes('scale(1 1.5)'))).toBe(true);expect(s.trees.filter(t=>t?.includes('816) scale(1 1.3)')).length).toBeGreaterThan(8);}
});

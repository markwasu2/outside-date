import {test,expect} from '@playwright/test';
test('backup yard has modeled service doors and intake panels',async({page})=>{
 await page.goto('/');const detail=await page.evaluate(async()=>{
 const src='/src/assets/campus/compound-backup.svg';const d=new DOMParser().parseFromString(await(await fetch(src)).text(),'image/svg+xml');const g=d.querySelector('[data-testid="backup-generator-detail"]');return {groups:d.querySelectorAll('[data-testid="backup-generator-detail"]').length,paths:g?.querySelectorAll('path').length,polygons:g?.querySelectorAll('polygon').length,exhausts:g?.querySelectorAll('[data-testid="backup-round-exhaust"]').length,roundFaces:g?.querySelectorAll('[data-testid="backup-round-exhaust"] ellipse').length};
 });expect(detail.groups).toBe(1);expect(detail.paths).toBeGreaterThanOrEqual(50);expect(detail.polygons).toBeGreaterThanOrEqual(39);expect(detail.exhausts).toBe(3);expect(detail.roundFaces).toBe(9);
});

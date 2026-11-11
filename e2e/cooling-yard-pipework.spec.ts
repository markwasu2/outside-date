import {test,expect} from '@playwright/test';
test('cooling yard has supply return pipes, valves and service cabinet details',async({page})=>{
 await page.goto('/');const detail=await page.evaluate(async()=>{const d=new DOMParser().parseFromString(await(await fetch('/src/assets/campus/compound-cooling.svg')).text(),'image/svg+xml');const g=d.querySelector('[data-testid="cooling-yard-pipework"]');return{groups:d.querySelectorAll('[data-testid="cooling-yard-pipework"]').length,paths:g?.querySelectorAll('path').length,polygons:g?.querySelectorAll('polygon').length,valves:g?.querySelectorAll('ellipse').length};});expect(detail.groups).toBe(1);expect(detail.paths).toBeGreaterThanOrEqual(20);expect(detail.polygons).toBeGreaterThanOrEqual(20);expect(detail.valves).toBe(3);
});

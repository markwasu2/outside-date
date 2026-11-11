import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('unbuilt hall is a ground survey, not a floating platform',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();
 const src=await page.getByTestId('hall-art-frame').locator('img').first().getAttribute('src');expect(src).toBeTruthy();
 const survey=await page.evaluate(async src=>{const d=new DOMParser().parseFromString(await(await fetch(src!)).text(),'image/svg+xml'),g=d.querySelector('[data-testid="surveyed-hall-plot"]');return{present:!!g,polygons:[...g!.querySelectorAll('polygon')].length,filteredParent:g!.parentElement?.getAttribute('filter'),surveyEdges:g!.querySelectorAll('path[stroke-dasharray]').length};},src);
 expect(survey.present).toBe(true);expect(survey.filteredParent).toBeNull();expect(survey.surveyEdges).toBe(4);expect(survey.polygons).toBe(12);
 await page.getByTestId('hall-art-frame').locator('img').evaluateAll(images=>Promise.all(images.map(img=>(img as HTMLImageElement).decode())));await page.screenshot({path:'/tmp/survey-opening-day.png'});await page.getByTestId('night-view').click();const image=page.getByTestId('hall-art-frame').locator('img').first();await expect(image).toHaveAttribute('data-art-stage','notStarted');await expect(image).toHaveCSS('filter','brightness(0.68) saturate(0.76)');await page.screenshot({path:'/tmp/survey-opening-night.png'});
});

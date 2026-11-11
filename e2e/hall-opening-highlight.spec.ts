import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('newly opened halls highlight their building art without a map-cell ring',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();
 await page.evaluate(async()=>{
 // @ts-expect-error arrival fixture
 const {useStore}=await import('/src/ui/store.ts');const prev=structuredClone(useStore.getState().state);prev.flags.siteOptioned=true;prev.halls[0].stageIndex=5;prev.halls[0].delivered=false;const now=structuredClone(prev);now.month++;now.halls[0].delivered=true;now.halls[0].energized=true;useStore.setState({prevState:prev,state:now,draft:now,plan:[]});
 });const hall=page.locator('[data-hall-id=H1]'),art=hall.getByTestId('hall-art-frame');await expect(hall).toHaveClass('board-arrival-flash');await expect(hall).toHaveCSS('box-shadow','none');await expect(hall).toHaveCSS('animation-name','none');await expect(art).toHaveCSS('animation-name','hallOpeningGlow');await art.evaluate(el=>{for(const a of el.getAnimations()){a.pause();a.currentTime=456;}});await page.screenshot({path:'/tmp/hall-opening-highlight-day.png'});await page.getByTestId('night-view').click();await page.screenshot({path:'/tmp/hall-opening-highlight-night.png'});await page.emulateMedia({reducedMotion:'reduce'});await expect(art).toHaveCSS('animation-name','none');await expect(hall).toHaveCSS('box-shadow','none');
});

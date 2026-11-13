import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
for(const [scenario,site,terrain] of [['first-campus','edge5-campus','campus'],['first-campus','edge5-meadow','meadow'],['first-campus','edge5-siding','depot'],['whale','quarry-ridge','quarry']])test(`closing illustration retains ${terrain} site through a loss`,async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();await page.evaluate(async({scenario,site})=>{
 // @ts-expect-error browser fixture
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.scenarioId=scenario;s.setup.site=site;s.phase='ended';s.outcome={kind:'lose',reason:'default'};useStore.setState({state:s,draft:s,screen:'reportCard',plan:[]});
 },{scenario,site});await expect(page.getByTestId('result-terrain')).toHaveAttribute('data-terrain',terrain!);await expect(page.getByTestId('result-terrain')).toHaveAttribute('viewBox','0 0 900 600');const image=await page.getByTestId('result-terrain').boundingBox();expect(image).not.toBeNull();expect(image!.width/image!.height).toBeCloseTo(1.5,2);await page.screenshot({path:`/tmp/closing-terrain-${terrain}.png`});await expect(page.getByTestId('result-campus')).toContainText('No foundation started');await expect(page.getByRole('button',{name:'Play again',exact:true})).toBeInViewport();
});

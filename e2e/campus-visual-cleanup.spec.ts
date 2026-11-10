import {test,expect} from '@playwright/test';
test('six-hall campus uses attached progress and small planned labels instead of cell rings',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error development-only source import
 const {useStore}=await import('/src/ui/store.ts');const next=structuredClone(useStore.getState().state);
 for(let i=4;i<6;i++)next.halls.push({...structuredClone(next.halls[0]),id:`H${i+1}`});
 next.halls.forEach((h:{stageIndex:number;stageActive:boolean;stageMonthsDone:number;pad:string},i:number)=>{h.stageIndex=i%4;h.stageActive=true;h.stageMonthsDone=1;h.pad=i<2?'near':'far';});
 useStore.setState({state:next,draft:next,plan:[{actionId:'advanceHall',params:{hallId:'H3'}}]});
 });
 await page.locator('[data-campus-object="H3"]').click();
 await expect(page.locator('[data-campus-object="H3"]')).toHaveCSS('outline-style','none');
 await expect(page.getByTestId('queued-ghost')).toHaveText('Planned');
 await page.getByTestId('map-popover').getByRole('button',{name:'Close',exact:true}).click();
 await page.screenshot({path:'docs/screenshots/cold2/clean-six-halls.png'});
 await expect(page.getByTestId('map-road')).toContainText('Road');
});

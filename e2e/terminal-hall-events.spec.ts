import {test,expect} from '@playwright/test';

test('ended construction does not draw a new inspection against terminal stage history',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const store=useStore.getState(),s=structuredClone(store.state),content=structuredClone(store.content);
 s.month=24;s.phase='playing';s.pending=null;s.cash=500000000;
 s.halls=s.halls.map((h:{id:string})=>({...h,stageIndex:3,stageActive:true,terminated:h.id!=='H2',delivered:h.id==='H2',deliveredMonth:h.id==='H2'?23:null}));
 content.events=content.events.filter((c:{id:string})=>c.id==='inspection_fail').map((c:object)=>({...c,odds:1}));
 useStore.setState({state:s,draft:s,content,plan:[]});
 });
 await page.getByRole('button',{name:'End month',exact:true}).click();
 const results=await page.evaluate(async()=>{
 // @ts-expect-error dev browser import
 const {useStore}=await import('/src/ui/store.ts');const s=useStore.getState().state;return {flags:s.flags,inspections:s.log.filter((x:{text:string})=>x.text==='A failed inspection')};
 });
 expect(results.inspections).toHaveLength(0);expect(Object.keys(results.flags).filter(k=>k.startsWith('inspectionFail:'))).toHaveLength(0);
 await expect(page.getByRole('button',{name:/H1 Terminated/})).toBeVisible();
 await page.screenshot({path:'docs/screenshots/cold2/terminal-hall-events.png'});
});

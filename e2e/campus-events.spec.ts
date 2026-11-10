import { expect, test } from '@playwright/test';
test('choice cards appear by their object and remain clear of the commit footer',async({page})=>{
  await page.goto('/');await page.getByTestId('quick-start').click();
  await page.evaluate(async()=>{
    // @ts-expect-error dev browser source import
    const {useStore}=await import('/src/ui/store.ts');const s=useStore.getState();const card=s.content.events.find((c:{id:string})=>c.id==='governor_visit');
    const next={...s.state,phase:'awaitingChoice',pending:{cardId:card.id,choices:card.choices}};useStore.setState({state:next,draft:next});
  });
  const card=page.getByTestId('campus-event-card');await expect(card).toHaveAttribute('data-campus-target','people');
  const box=await card.boundingBox(),footer=await page.getByRole('button',{name:'End month',exact:true}).boundingBox();
  expect(box!.y+box!.height).toBeLessThan(footer!.y);expect(box!.x).toBeGreaterThan(100);
  await page.screenshot({path:'docs/screenshots/cold2/campus-event-people.png'});
  await page.setViewportSize({width:1440,height:900});
  await page.screenshot({path:'docs/screenshots/cold2/campus-event-1440.png'});
  await card.getByTestId('event-choice-commit').click();await expect(card).toHaveCount(0);
});
test('a no-choice event appears at the matching object without blocking End month',async({page})=>{
  await page.goto('/');await page.getByTestId('quick-start').click();
  await page.evaluate(async()=>{
    // @ts-expect-error dev browser source import
    const {useStore}=await import('/src/ui/store.ts');const s=useStore.getState();const card=s.content.events.find((c:{id:string})=>c.id==='restudy');
    const next={...s.state,log:[...s.state.log,{month:s.state.month,kind:'event',text:card.title,detail:card.body}]};useStore.setState({state:next,draft:next});
  });
  const notice=page.getByTestId('event-notice');await expect(notice).toHaveAttribute('data-campus-target','substation');
  await page.screenshot({path:'docs/screenshots/cold2/campus-event-study.png'});
  const end=page.getByRole('button',{name:'End month',exact:true});expect(await end.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  await notice.getByRole('button',{name:'Dismiss'}).click();await expect(notice).toHaveCount(0);
});

test('expansion choice states the real campaign cutoff before either answer',async({page})=>{
  await page.goto('/');await page.getByTestId('quick-start').click();
  await page.evaluate(async()=>{
    // @ts-expect-error dev browser source import
    const {useStore}=await import('/src/ui/store.ts');const s=useStore.getState();const card=s.content.events.find((c:{id:string})=>c.id==='the_ask');
    const next={...s.state,phase:'awaitingChoice',pending:{cardId:card.id,choices:card.choices}};useStore.setState({state:next,draft:next});
  });
  await expect(page.getByTestId('expansion-cutoff')).toContainText('Y6 M1');
  await expect(page.getByTestId('expansion-cutoff')).toContainText('Expansion does not extend this deadline');
  // The commitments preview follows the ask's scale: it appears once the dial leaves Decline.
  await page.getByTestId('event-scale').press('End');
  await expect(page.getByTestId('expansion-funding')).toContainText('equity +');
  await expect(page.getByTestId('expansion-funding')).toContainText('extra pad months');
  await expect(page.getByTestId('expansion-funding')).toContainText('line losses once delivered');
  await page.screenshot({path:'docs/screenshots/cold2/expansion-funding.png'});
});

test('inspection notice names and pins the newly affected hall',async({page})=>{
 await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev source import
 const {useStore}=await import('/src/ui/store.ts');const s=useStore.getState();const card=s.content.events.find((c:{id:string})=>c.id==='inspection_fail');
 const next=structuredClone(s.state);next.flags['inspectionFail:H3']=true;next.log.push({month:next.month,kind:'event',text:card.title,detail:card.body});useStore.setState({prevState:s.state,state:next,draft:next});
 });
 const notice=page.getByTestId('event-notice');await expect(notice).toHaveAttribute('data-campus-target','H3');await expect(notice).toContainText('H3 failed inspection');await page.screenshot({path:'docs/screenshots/cold2/inspection-target.png'});
});

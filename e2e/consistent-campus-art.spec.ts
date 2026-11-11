import {test,expect} from '@playwright/test';

test('campus assets share one original SVG set, with distinct stages and valid bounds',async({page})=>{
 await page.goto('/');
 const assets=await page.evaluate(async()=>{
  // @ts-expect-error dev-only source import
  const art=await import('/src/ui/art.ts');
  const entries=Object.entries({...Object.fromEntries(Object.entries(art.STAGE_ART).map(([k,v])=>['hall '+k,v.img])),...Object.fromEntries(Object.entries(art.TILE_ART).map(([k,v])=>['tile '+k,v.img])),...Object.fromEntries(Object.entries(art.SUBSTATION_ART).map(([k,v])=>['substation '+k,v])),...Object.fromEntries(Object.entries(art.PLANT_ART).map(([k,v])=>['plant '+k,v])),...Object.fromEntries(Object.entries(art.VEHICLE_ART).map(([k,v])=>['vehicle '+k,v.img])),...Object.fromEntries(Object.entries(art.COOLING_ART).map(([k,v])=>['cooling '+k,v.img])),...Object.fromEntries(Object.entries(art.EQUIP_ART).map(([k,v])=>['equipment '+k,v.img]))});
  return Promise.all(entries.map(async([name,url])=>({name,url,body:await(await fetch(url as string)).text()})));
 });
 for(const asset of assets){expect(asset.url).toContain('/assets/campus/');expect(asset.body).toContain('<svg');expect(asset.body).not.toContain('<image');}
 const stages=assets.filter(a=>a.name.startsWith('hall '));expect(new Set(stages.map(a=>a.body)).size).toBe(7);
 await page.setViewportSize({width:1440,height:1000});
 await page.setContent(`<main style="font:14px system-ui;background:#eee3c6;padding:20px"><h1>Outside Date · campus art</h1><p>Original geometry · shared isometric camera · consistent light and palette</p><div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px">${assets.filter(a=>a.name!=='tile road').map(a=>`<figure style="margin:0;border:1px solid #c1b392;border-radius:8px;background:#f9f3df;padding:10px;text-align:center"><img width="176" height="132" src="http://localhost:5173${a.url}"/><figcaption>${a.name}</figcaption></figure>`).join('')}</div></main>`);
 await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>(img as HTMLImageElement).decode())));
 await page.screenshot({path:'/tmp/campus-art-sheet.png',fullPage:true});
});

test('new art keeps six halls and plant phases readable at desktop and compact widths',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/');await page.getByTestId('quick-start').click();
 await page.evaluate(async()=>{
 // @ts-expect-error dev-only source import
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);
 for(let i=s.halls.length;i<6;i++)s.halls.push({...structuredClone(s.halls[0]),id:`H${i+1}`});
 s.halls.forEach((h:{stageIndex:number;stageActive:boolean;stageMonthsDone:number;delivered:boolean},i:number)=>{h.stageIndex=i-1;h.stageActive=true;h.stageMonthsDone=99;h.delivered=i===5;});
 s.power.plants[0].plannedOnlineMonth=3;s.power.plants[1].plannedOnlineMonth=0;s.power.plants[1].onlineMonth=0;
 useStore.setState({state:s,draft:s});
 });
 await expect(page.getByTestId('plant-buildout-A')).toHaveAttribute('data-build-state','building');
 await expect(page.getByTestId('plant-buildout-B')).toHaveAttribute('data-build-state','online');
 for(const width of [1440,800]){
  await page.setViewportSize({width,height:900});
  for(let i=1;i<=6;i++){await expect(page.getByTestId(`caption-H${i}`)).toBeInViewport();expect((await page.locator(`[data-hall-id="H${i}"]`).boundingBox())!.width).toBeGreaterThan(120);}
  await page.screenshot({path:`/tmp/campus-art-six-${width}.png`});
 }
});

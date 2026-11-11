import {test,expect} from '@playwright/test';
test('finished building materials stay consistent through shell, fitout, testing and operation',async({page})=>{
 await page.goto('/');const assets=await page.evaluate(async()=>{
 // @ts-expect-error source art import
 const {STAGE_ART}=await import('/src/ui/art.ts');return Promise.all(['shell','fitout','rfs','delivered'].map(async id=>({id,url:STAGE_ART[id].img,body:await(await fetch(STAGE_ART[id].img)).text()})));
 });for(const a of assets){expect(a.body).toContain('stop-color="#c8cbbb"');expect(a.body).toContain('stop-color="#536e72"');expect(a.body).toContain('fill="#3e555c"');expect(a.body).toContain('viewBox="15 -12 300 242"');expect(a.body).not.toContain('<image');}
 await page.setViewportSize({width:1440,height:700});await page.setContent(`<main style="background:#eae5d1;font:16px system-ui;padding:24px;color:#354b42"><h1>Building materials through construction</h1><p>Pale cladding · shaded service side · graphite roof · existing stage detail</p><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px">${assets.map(a=>`<figure style="margin:0;background:#d4d9d1;border-radius:12px;padding:16px"><img style="width:100%;height:300px" src="http://localhost:5173${a.url}"/><figcaption style="text-align:center">${a.id}</figcaption></figure>`).join('')}</div></main>`);await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>(i as HTMLImageElement).decode())));await page.screenshot({path:'/tmp/building-materials-stages.png'});
});

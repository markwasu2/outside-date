import {test,expect} from '@playwright/test';
import fs from 'node:fs';
test.use({storageState:{cookies:[],origins:[]}});
for(const width of [1440,1280])test(`built utility yards decode through sale at desktop ${width}`,async({page})=>{
 test.setTimeout(65000);await page.setViewportSize({width,height:width===1280?720:900});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const trace:string[]=[];
 await page.goto('/');await expect(page.getByTestId('simple-start')).toContainText('Build a data center.');await page.screenshot({path:`/tmp/utility-built-${width}-title.png`});
 await page.getByTestId('start-first-campus').click();await expect(page.getByTestId('tycoon-game')).toBeVisible();
 await expect(page.getByTestId('simple-goal')).toContainText('0/1');await expect(page.getByTestId('action-desk')).toHaveCount(0);await expect(page.getByTestId('cold-intro')).toHaveCount(0);await expect(page.getByTestId('month-review')).toHaveCount(0);
 await page.screenshot({path:`/tmp/utility-built-${width}-opening.png`});
 await expect(page.getByTestId('simple-next-month')).toBeInViewport();
 const roadLabel=page.getByTestId('road-label-group');await expect(roadLabel).toBeVisible();const nameBox=await roadLabel.locator('span').first().boundingBox(),poleBox=await page.getByTestId('road-poles').boundingBox(),landBox=await page.locator('[data-map-control="road"] button').boundingBox();expect(nameBox&&poleBox&&landBox).toBeTruthy();expect(poleBox!.x).toBeGreaterThan(nameBox!.x+nameBox!.width);expect(Math.abs(poleBox!.y-nameBox!.y)).toBeLessThan(2);expect(poleBox!.x+poleBox!.width).toBeLessThan(landBox!.x);
 for(let month=0;month<35;month++){
  if(!await page.getByTestId('tycoon-game').count())break;
  const slider=page.getByTestId('event-scale');if(await slider.count()){await slider.fill('0');await page.getByTestId('event-choice-commit').click();}
  if(await page.getByTestId('simple-sell').count()){const hallImage=page.getByTestId('hall-art-frame').locator('img').first();const hallSource=await hallImage.getAttribute('src');expect(await page.evaluate(async src=>(await(await fetch(src!)).text()).includes('data-testid="hall-service-elevation"'),hallSource)).toBe(true);expect(await page.evaluate(async src=>(await(await fetch(src!)).text()).includes('data-testid="hall-roof-air-handlers"'),hallSource)).toBe(true);await expect(page.getByTestId('campus-service-traffic')).toBeVisible();await expect(page.getByTestId('service-van-detail')).toBeVisible();await expect(page.getByTestId('service-road-surface')).toBeVisible();await expect(page.getByTestId('campus-entry')).toBeVisible();await expect(page.getByTestId('entry-gatehouse-detail')).toBeVisible();await expect(page.getByTestId('parked-car-detail')).toHaveCount(3);await expect(page.getByTestId('utility-screen-planting')).toBeVisible();await expect(page.getByTestId('campus-perimeter')).toHaveAttribute('data-state','finished');await expect(page.getByTestId('campus-service-gate')).toBeVisible();await expect(page.getByTestId('simple-feedback')).toContainText('Campus ready to sell');await expect(page.getByTestId('monthly-receipt')).not.toContainText('Review the blockers');await expect(page.getByTestId('power-map-state')).toHaveText('energized');const powerButton=await page.locator('[data-map-control="substation"] button').boundingBox(),powerState=await page.getByTestId('power-map-state').boundingBox();expect(powerButton&&powerState&&powerState.y>=powerButton.y+powerButton.height).toBeTruthy();await expect(page.getByTestId('map-substation')).toHaveAttribute('data-build-state','done');await expect(page.getByTestId('map-substation').locator('img')).toHaveCount(1);await page.getByTestId('map-substation').locator('img').evaluate(async img=>{await (img as HTMLImageElement).decode();if(!(img as HTMLImageElement).naturalWidth)throw new Error('Power cabinet image failed to decode');});await page.getByTestId('support-yard').locator('img').evaluateAll(images=>Promise.all(images.map(img=>(img as HTMLImageElement).decode())));await expect(page.getByTestId('support-yard')).toContainText('Cooling yard');const coolingSource=await page.getByTestId('support-yard').locator('img').first().getAttribute('src');expect(await page.evaluate(async src=>(await(await fetch(src!)).text()).includes('data-testid="cooling-yard-pipework"'),coolingSource)).toBe(true);await expect(page.getByTestId('cooling-fan-rotor')).toHaveCount(6);await expect(page.getByTestId('support-yard')).toContainText('Backup units');const backupSource=await page.getByTestId('support-yard').locator('img').nth(1).getAttribute('src');expect(await page.evaluate(async src=>(await(await fetch(src!)).text()).includes('data-testid="backup-generator-detail"'),backupSource)).toBe(true);await page.screenshot({path:`/tmp/utility-built-${width}-ready-sale.png`});await expect(page.getByTestId('hall-night-lights')).toHaveCount(0);await page.getByTestId('night-view').click();await expect(page.getByTestId('hall-night-lights')).toBeVisible();await page.screenshot({path:`/tmp/utility-built-${width}-night.png`});await page.emulateMedia({reducedMotion:'reduce'});await expect(page.getByTestId('service-van')).toHaveCSS('animation-name','none');await page.getByTestId('night-view').click();await page.getByTestId('simple-sell').click();await page.getByTestId('commit-takeout').click();break;}
  const cure=page.getByRole('button',{name:'Unfreeze building funds · 2 points',exact:true});if(await cure.count()&&await cure.isEnabled())await cure.click();
  for(const id of (width===1440?['road','substation','siteOffice','H1']:['road','siteOffice','H1','substation'])){
   const direct=page.locator(`[data-map-control="${id}"] button`);
   if(!await direct.count()||!await direct.isEnabled())continue;
   const label=await direct.innerText();
   if(/Buy land|Build foundation|Build frame|Build walls|Install interiors|Test & open|Repair/.test(label)){trace.push(`month ${month+1}: ${label}`);await direct.click();continue;}
   if(id==='H1')continue;
   await direct.click();const panel=page.getByTestId('simple-object-panel');await expect(panel).toBeVisible();
   for(let pass=0;pass<3;pass++){
    const buttons=panel.getByTestId('simple-do-action');let acted=false;
    for(let i=0;i<await buttons.count();i++){const b=buttons.nth(i),name=await b.innerText();if(/Start power study|Order electrical equipment|Apply for building permit/.test(name)&&await b.isEnabled()){trace.push(`month ${month+1}: ${name}`);await b.click();acted=true;break;}}
    if(!acted)break;
   }
   await panel.getByRole('button',{name:'Close',exact:true}).click();
  }
  trace.push(await page.getByTestId('simple-feedback').innerText());fs.writeFileSync('/tmp/utility-built-trace.txt',trace.join('\n'));
  if([1,4,10,16,19].includes(month))await page.screenshot({path:`/tmp/utility-built-${width}-month-${month+1}.png`});
  await page.getByTestId('simple-next-month').click();
 }
 for(let i=0;i<8;i++){const next=page.getByRole('button',{name:/^(Skip|Continue)$/});if(!await next.count())break;await next.first().click();}
 await expect(page.getByRole('heading',{name:'Campus sold',exact:true})).toBeVisible();await expect(page.locator('body')).toContainText('1/1 data centers opened');await page.screenshot({path:`/tmp/utility-built-${width}-result.png`});
 expect(errors).toEqual([]);fs.writeFileSync('/tmp/utility-built-trace.txt',trace.join('\n'));
});

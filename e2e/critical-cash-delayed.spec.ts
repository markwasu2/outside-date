import {test,expect} from '@playwright/test';
import fs from 'node:fs';
test.use({storageState:{cookies:[],origins:[]}});
for(const width of [1280])test(`a delayed build exposes critical cash before the actual loss at desktop ${width}`,async({page})=>{
 test.setTimeout(65000);await page.setViewportSize({width,height:width===1280?720:900});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const trace:string[]=[];let visits=0,warned=false;
 await page.goto('/');await expect(page.getByTestId('simple-start')).toContainText('Build a data center.');await page.screenshot({path:`/tmp/delayed-start-${width}-title.png`});
 await page.getByTestId('start-first-campus').click();await expect(page.getByTestId('tycoon-game')).toBeVisible();
 await expect(page.getByTestId('simple-goal')).toContainText('0/1');await expect(page.getByTestId('action-desk')).toHaveCount(0);await expect(page.getByTestId('cold-intro')).toHaveCount(0);await expect(page.getByTestId('month-review')).toHaveCount(0);
 await page.screenshot({path:`/tmp/delayed-start-${width}-opening.png`});
 await expect(page.getByTestId('simple-next-month')).toBeInViewport();
 for(let month=0;month<35;month++){
  if(!await page.getByTestId('tycoon-game').count())break;
  if(!warned&&await page.getByTestId('critical-cash-warning').count()){warned=true;await expect(page.getByTestId('critical-cash-warning')).toBeInViewport();await expect(page.getByTestId('critical-cash-warning')).toContainText('The build budget is not cash for bills');await page.getByTestId('review-low-cash').click();await expect(page.getByTestId('money-current-position')).toBeVisible();await page.screenshot({path:'/tmp/critical-cash-money.png'});await page.getByTestId('simple-object-panel').getByRole('button',{name:'Close',exact:true}).click();await page.screenshot({path:'/tmp/critical-cash-live-build.png'});}
  const slider=page.getByTestId('event-scale');if(await slider.count()){await slider.fill(await slider.getAttribute('max')??'100');await page.getByTestId('event-choice-commit').click();}
  if(await page.getByTestId('simple-sell').count()){await expect(page.getByTestId('campus-service-traffic')).toBeVisible();await expect(page.getByTestId('campus-entry')).toBeVisible();await expect(page.getByTestId('campus-perimeter')).toHaveAttribute('data-state','finished');await expect(page.getByTestId('campus-service-gate')).toBeVisible();await expect(page.getByTestId('simple-feedback')).toContainText('Campus ready to sell');await expect(page.getByTestId('monthly-receipt')).not.toContainText('Review the blockers');await expect(page.getByTestId('power-map-state')).toHaveText('energized');const powerButton=await page.locator('[data-map-control="substation"] button').boundingBox(),powerState=await page.getByTestId('power-map-state').boundingBox();expect(powerButton&&powerState&&powerState.y>=powerButton.y+powerButton.height).toBeTruthy();await expect(page.getByTestId('map-substation')).toHaveAttribute('data-build-state','done');await expect(page.getByTestId('map-substation').locator('img')).toHaveCount(1);await page.getByTestId('map-substation').locator('img').evaluate(async img=>{await (img as HTMLImageElement).decode();if(!(img as HTMLImageElement).naturalWidth)throw new Error('Power cabinet image failed to decode');});await page.getByTestId('support-yard').locator('img').evaluateAll(images=>Promise.all(images.map(img=>(img as HTMLImageElement).decode())));await expect(page.getByTestId('support-yard')).toContainText('Cooling yard');await expect(page.getByTestId('cooling-fan-rotor')).toHaveCount(6);await expect(page.getByTestId('support-yard')).toContainText('Backup units');await page.screenshot({path:`/tmp/delayed-start-${width}-ready-sale.png`});await expect(page.getByTestId('hall-night-lights')).toHaveCount(0);await page.getByTestId('night-view').click();await expect(page.getByTestId('hall-night-lights')).toBeVisible();await page.screenshot({path:`/tmp/delayed-start-${width}-night.png`});await page.emulateMedia({reducedMotion:'reduce'});await expect(page.getByTestId('service-van')).toHaveCSS('animation-name','none');await page.getByTestId('night-view').click();await page.getByTestId('simple-sell').click();await page.getByTestId('commit-takeout').click();break;}
  const cure=page.getByRole('button',{name:'Unfreeze building funds · 2 points',exact:true});if(await cure.count()&&await cure.isEnabled())await cure.click();
  for(const id of (width===1440?['road','substation','siteOffice','H1']:['road','siteOffice','H1','substation'])){
   const direct=page.locator(`[data-map-control="${id}"] button`);
   if(!await direct.count()||!await direct.isEnabled())continue;
   const label=await direct.innerText();if(id==='H1'&&month<14)continue;
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
  const explore=page.getByTestId('explore-contacts');if(await explore.count()){await explore.click();const panel=page.getByTestId('simple-object-panel'),choices=panel.getByTestId('simple-do-action');await expect(choices.first()).toBeVisible();for(let i=0;i<await choices.count();i++){const choice=choices.nth(i);if(await choice.isEnabled()&&/Meet/.test(await choice.innerText())){trace.push('VISIT: '+await choice.innerText());visits++;await choice.click();break;}}await panel.getByRole('button',{name:'Close',exact:true}).click();}
  trace.push(await page.getByTestId('simple-feedback').innerText());fs.writeFileSync('/tmp/delayed-start-trace.txt',trace.join('\n'));
  if([1,4,10,16,19].includes(month))await page.screenshot({path:`/tmp/delayed-start-${width}-month-${month+1}.png`});
  await page.getByTestId('simple-next-month').click();
 }
 for(let i=0;i<8;i++){const next=page.getByRole('button',{name:/^(Skip|Continue)$/});if(!await next.count())break;await next.first().click();}
 expect(warned).toBe(true);expect(visits).toBeGreaterThan(0);await expect(page.getByRole('heading',{name:'Project ended',exact:true})).toBeVisible();await expect(page.getByTestId('simple-result')).toContainText('Cash ran out');await page.screenshot({path:'/tmp/delayed-start-final.png'});expect(errors).toEqual([]);
});

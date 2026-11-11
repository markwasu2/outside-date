import {test,expect} from '@playwright/test';
import fs from 'node:fs';
test.use({storageState:{cookies:[],origins:[]}});
for(const width of [1280])test(`an out-of-balance loan uses Money and resumes without a false paperwork cure`,async({page})=>{
 test.setTimeout(65000);await page.setViewportSize({width,height:width===1280?720:900});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const trace:string[]=[];
 await page.goto('/');await expect(page.getByTestId('simple-start')).toContainText('Build a data center.');await page.screenshot({path:`/tmp/balance-journey-${width}-title.png`});
 await page.getByTestId('start-first-campus').click();await expect(page.getByTestId('tycoon-game')).toBeVisible();await page.evaluate(async()=>{
 // @ts-expect-error dev fixture
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().draft);s.seed=42;s.rng={s:42};useStore.setState({state:s,draft:s});});
 await expect(page.getByTestId('simple-goal')).toContainText('0/1');await expect(page.getByTestId('action-desk')).toHaveCount(0);await expect(page.getByTestId('cold-intro')).toHaveCount(0);await expect(page.getByTestId('month-review')).toHaveCount(0);
 await page.screenshot({path:`/tmp/balance-journey-${width}-opening.png`});
 await expect(page.getByTestId('simple-next-month')).toBeInViewport();
 for(let month=0;month<35;month++){
  if(!await page.getByTestId('tycoon-game').count())break;
  const slider=page.getByTestId('event-scale');if(await slider.count()){await slider.fill('0');await page.getByTestId('event-choice-commit').click();}
  if(await page.getByTestId('simple-sell').count()){await expect(page.getByTestId('campus-service-traffic')).toBeVisible();await expect(page.getByTestId('campus-entry')).toBeVisible();await expect(page.getByTestId('simple-feedback')).toContainText('Campus ready to sell');await expect(page.getByTestId('monthly-receipt')).not.toContainText('Review the blockers');await page.screenshot({path:`/tmp/balance-journey-${width}-ready-sale.png`});await expect(page.getByTestId('hall-night-lights')).toHaveCount(0);await page.getByTestId('night-view').click();await expect(page.getByTestId('hall-night-lights')).toBeVisible();await page.screenshot({path:`/tmp/balance-journey-${width}-night.png`});await page.emulateMedia({reducedMotion:'reduce'});await expect(page.getByTestId('service-van')).toHaveCSS('animation-name','none');await page.getByTestId('night-view').click();await page.getByTestId('simple-sell').click();await page.getByTestId('commit-takeout').click();break;}
  const funding=page.getByRole('button',{name:'Review funding in Money',exact:true});
  if(await funding.count()){
   await expect(page.getByRole('button',{name:'Unfreeze building funds · 2 points',exact:true})).toHaveCount(0);
   await page.evaluate(async()=>{
    // @ts-expect-error dev fixture
    const {useStore}=await import('/src/ui/store.ts');useStore.getState().autosave();});
   fs.writeFileSync('/tmp/balance-frozen-save.json',await page.evaluate(()=>localStorage.getItem('outside-date-save')!));
   await page.screenshot({path:'/tmp/balance-freeze.png'});await funding.click();await expect(page.getByTestId('money-balance-gap')).toContainText('Remaining build:');await expect(page.getByTestId('money-balance-gap')).toContainText('Cash in the bank is separate');await page.screenshot({path:'/tmp/balance-money.png'});
   const panel=page.getByTestId('simple-object-panel');await expect(panel.getByRole('button',{name:'Unfreeze building funds',exact:true})).toHaveCount(0);await panel.getByRole('button',{name:'Equity call',exact:true}).click();await expect(page.getByTestId('money-pending-funds')).toBeVisible();await expect(page.getByTestId('money-balance-gap')).toHaveCount(0);await page.screenshot({path:'/tmp/balance-refunded.png'});await panel.getByRole('button',{name:'Close',exact:true}).click();await expect(page.getByTestId('simple-freeze')).toContainText('lender paperwork');await expect(page.getByRole('button',{name:'Unfreeze building funds · 2 points',exact:true})).toBeEnabled();
  }
  const cure=page.getByRole('button',{name:'Unfreeze building funds · 2 points',exact:true});if(await cure.count()&&await cure.isEnabled()){await cure.click();await expect(page.getByTestId('simple-freeze')).toHaveCount(0);await page.screenshot({path:'/tmp/balance-paperwork-cleared.png'});}
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
  trace.push(await page.getByTestId('simple-feedback').innerText());fs.writeFileSync('/tmp/balance-journey-trace.txt',trace.join('\n'));
  if([1,4,10,16,19].includes(month))await page.screenshot({path:`/tmp/balance-journey-${width}-month-${month+1}.png`});
  await page.getByTestId('simple-next-month').click();
 }
 for(let i=0;i<8;i++){const next=page.getByRole('button',{name:/^(Skip|Continue)$/});if(!await next.count())break;await next.first().click();}
 await expect(page.getByRole('heading',{name:'Campus sold',exact:true})).toBeVisible();await expect(page.locator('body')).toContainText('1/1 data centers opened');await page.screenshot({path:`/tmp/balance-journey-${width}-result.png`});
 expect(errors).toEqual([]);fs.writeFileSync('/tmp/balance-journey-trace.txt',trace.join('\n'));
});

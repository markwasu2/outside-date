import {test,expect} from '@playwright/test';
import fs from 'node:fs';
test('fresh title through signing, object-only construction and final report',async({page})=>{
 test.setTimeout(180_000);await page.setViewportSize({width:1440,height:900});
 const trace:string[]=[];const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(() => { Math.random = () => 1 / 1_000_000_000; });
 await page.goto('/');await page.locator('select').first().selectOption('tutorial-edge5');await page.getByRole('button',{name:'New game',exact:true}).click();
 for(const name of ['Next: Hall tier','Next: Cooling','Next: Contractor','Next: Lease','Next: Forecast','Next: Capital stack','Next: Power','Next: Insurance','Review closing table'])await page.getByRole('button',{name,exact:true}).click();
 await page.screenshot({path:'docs/screenshots/cold2/journey-closing.png'});await page.getByRole('button',{name:'Start campaign',exact:true}).click();
 for(let turn=0;turn<100;turn++){
  const heading=page.getByRole('heading',{name:/Rating the campus|Report card|You lose|You win|You scraped by/});if(await heading.count())break;
  if(await page.getByTestId('event-choice').count()){trace.push('EVENT '+await page.getByTestId('event-choice').first().innerText());await page.getByTestId('event-choice').first().click();continue;}
  trace.push((await page.getByTestId('campus-status').innerText()).replaceAll('\n',' '));
  const notice=page.getByTestId('event-notice-dismiss');while(await notice.count())await notice.first().click();
  for(const target of ['substation','road','pond','H1','laydownYard','siteOffice']){
   await page.locator(`[data-campus-object="${target}"]`).click();const popup=page.getByTestId('map-popover');await expect(popup).toBeVisible();
   if(target==='siteOffice' && await popup.getByRole('button',{name:'Insurance & lender',exact:true}).count()){
    await popup.getByRole('button',{name:'Insurance & lender',exact:true}).click();const cure=popup.getByTestId('popover-action').filter({hasText:'Cure'});if(await cure.count() && await cure.isEnabled()){await expect(page.getByTestId('next-step-card')).toContainText('Cure the lender draw freeze');await page.screenshot({path:'docs/screenshots/cold2/journey-freeze-cure.png'});trace.push('PLAN '+await cure.innerText());await cure.click();}
    await popup.getByRole('button',{name:'Permits & people',exact:true}).click();
   }
   // Only intentional build/prerequisite actions; no generic click-all, no bot or state injection.
   const wanted=/Cure|Commission the interconnection|Order the switchgear|Option the site|File building permit|File water permit|File air permit|near pad|Advance construction|Fix inspection|Cure the draw freeze|Confirm the rack schedule/;
   const seen=new Set<string>();
   for(let pass=0;pass<12;pass++){
    const rows=popup.getByTestId('popover-action');let clicked=false;
    for(let i=0;i<await rows.count();i++){
     const row=rows.nth(i),label=await row.innerText();if(!wanted.test(label)||seen.has(label)||!await row.isEnabled())continue;
     trace.push('PLAN '+label.replaceAll('\n',' '));seen.add(label);await row.click();clicked=true;break;
    }if(!clicked)break;
   }
   await popup.getByRole('button',{name:'Close',exact:true}).click();await expect(popup).toHaveCount(0);
  }
  if([0,5,10,15].includes(turn))await page.screenshot({path:`docs/screenshots/cold2/journey-${turn}.png`});
  if(await page.getByTestId('price-takeout-banner').count()){trace.push('PRICE TAKEOUT');await page.getByTestId('price-takeout-banner').click();break;}
  await page.getByRole('button',{name:'End month',exact:true}).click();
 }
 for(let i=0;i<6;i++){
  const next=page.getByRole('button',{name:/^(Skip|Continue)$/});if(!await next.count())break;await next.first().click();
 }
 await expect(page.getByRole('heading',{name:/Report card|You lose|You win|You scraped by/}).first()).toBeVisible();
 expect(trace.filter(t=>t.startsWith('PLAN ')).length).toBeGreaterThan(5);
 expect(trace).toContain('PRICE TAKEOUT');
 await expect(page.getByRole('heading',{name:'Report card',exact:true})).toBeVisible();
 await expect(page.getByTestId('power-timing-closeout')).toHaveCount(0);
 trace.push('END '+await page.locator('body').innerText());fs.writeFileSync('/tmp/immersive-journey-trace.txt',trace.join('\n'));
 await page.screenshot({path:'docs/screenshots/cold2/journey-report.png'});expect(errors).toEqual([]);
});

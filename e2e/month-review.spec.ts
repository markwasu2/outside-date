import {test,expect} from '@playwright/test';
import fs from 'node:fs';
test('review first: choose campus work, see its consequences, reach the close without advice',async({page})=>{
 test.setTimeout(55000); await page.setViewportSize({width:1440,height:900});
 const trace:string[]=[];fs.mkdirSync('/tmp/month-review',{recursive:true});
 await page.goto('/');await page.getByRole('button',{name:'Tutorial',exact:true}).click();
 await expect(page.getByTestId('month-review')).toContainText('Your opening position');
 await expect(page.getByTestId('next-step-card')).toHaveCount(0);
 await expect(page.getByTestId('review-option')).toHaveCount(3);
 await page.getByTestId('cold-intro-dismiss').click();
 await page.setViewportSize({width:1280,height:720});
 await expect(page.getByTestId('review-option').last()).toBeInViewport();
 await page.screenshot({path:'/tmp/month-review/opening.png'});
 await page.setViewportSize({width:1440,height:900});
 // An option opens a place to inspect; it cannot spend money or focus.
 const cash=await page.getByTestId('campus-status').innerText();
 await page.getByTestId('review-option').first().click();
 await expect(page.getByTestId('map-popover')).toBeVisible();
 expect(await page.getByTestId('campus-status').innerText()).toBe(cash);
 await page.getByTestId('map-popover').getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Compare funding offers',exact:false}).click();
 await expect(page.getByTestId('map-popover').getByRole('button',{name:'Raise capital',exact:true})).toHaveAttribute('aria-pressed','true');
 expect(await page.getByTestId('campus-status').innerText()).toBe(cash);
 await page.screenshot({path:'/tmp/month-review/funding.png'});

 await page.getByTestId('map-popover').getByRole('button',{name:'Close',exact:true}).click();
 for(let month=0;month<35;month++){
  if(!await page.getByTestId('month-review').count())break;
  const slider=page.getByTestId('event-scale');
  if(await slider.count()){
   const max=Number(await slider.getAttribute('max'));await slider.fill(String(Math.floor(max/2)));
   await page.getByTestId('event-choice-commit').click();
  }
  if(!await page.getByTestId('month-review').count())break;
  if(await page.getByTestId('price-takeout-banner').count()){
   await page.getByTestId('price-takeout-banner').click();await page.getByTestId('commit-takeout').click();break;
  }
  trace.push(((await page.getByTestId('month-review').textContent() ?? '')).replaceAll('\n',' '));
  if(await page.getByRole('button',{name:'Review the lender test',exact:false}).count()) {
   await expect(page.getByRole('button',{name:'Compare funding offers',exact:false})).toHaveCount(0);
   await page.getByRole('button',{name:'Review the lender test',exact:false}).click();
   await expect(page.getByTestId('lender-snapshot')).toContainText('Outstanding debt:');
   await page.screenshot({path:'/tmp/month-review/lender.png'});
   await page.getByTestId('map-popover').getByRole('button',{name:'Close',exact:true}).click();
  }

  const contacts=page.getByTestId('review-option').filter({hasText:/^Visit .* contacts/});
  if(month===5 && await contacts.count()) {
   const before=await page.getByTestId('campus-status').innerText();
   await contacts.click();
   await expect(page.getByTestId('contact-brief')).toContainText('A visit meets one member');
   const popup=page.getByTestId('map-popover');await expect(popup.getByTestId('popover-action')).toHaveCount(1);
   expect(await page.getByTestId('campus-status').innerText()).toBe(before);
   await page.screenshot({path:'/tmp/month-review/contacts.png'});
   await popup.getByRole('button',{name:'Show all contacts',exact:true}).click();
   expect(await popup.getByTestId('popover-action').count()).toBeGreaterThan(1);
   await popup.getByRole('button',{name:'Close',exact:true}).click();
  }
  const reviewText=await page.getByTestId('review-developments').count() ? await page.getByTestId('review-developments').innerText() : null;
  const notice=page.getByTestId('event-notice-dismiss');for(let n=0;n<5 && await notice.count();n++)await notice.first().click();
  // Inspect the actual campus, not the optional recommendation. Decide on prerequisites,
  // permits and building work; free tenant confirmation is a separate office choice.
  for(const target of ['substation','road','pond','H1','siteOffice']){
   await page.locator(`[data-campus-object="${target}"]`).click();const popup=page.getByTestId('map-popover');
   await expect(popup).toBeVisible();
   if(target==='siteOffice'){
    await popup.getByRole('button',{name:'Insurance & lender',exact:true}).click();
    const cure=popup.getByTestId('popover-action').filter({hasText:'Cure'});
    if(await cure.count() && await cure.isEnabled())await cure.click();
    await popup.getByRole('button',{name:'Permits & people',exact:true}).click();
   }
   const wanted=/Commission (the )?interconnection|Order the switchgear|Option the site|File building permit|File water permit|File air permit|near pad|Advance construction|Start commissioning|Fix inspection|Confirm the rack schedule/;
   const seen=new Set<string>();
   for(let pass=0;pass<8;pass++){
    const rows=popup.getByTestId('popover-action');let acted=false;
    for(let i=0;i<await rows.count();i++){
     const row=rows.nth(i),label=await row.innerText();
     if(wanted.test(label)&&!seen.has(label)&&await row.isEnabled()){seen.add(label);await row.click();acted=true;break;}
    }if(!acted)break;
   }
   await popup.getByRole('button',{name:'Close',exact:true}).click();
   await expect(popup).toHaveCount(0);
  }
  // Last month's evidence stays fixed while new actions change the live options.
  if(reviewText!==null)expect(await page.getByTestId('review-developments').innerText()).toBe(reviewText);
  if([1,2,5,10,15].includes(month))await page.screenshot({path:`/tmp/month-review/month-${month}.png`});
  await page.getByRole('button',{name:'End month',exact:true}).click();
 }
 for(let i=0;i<8;i++){
  const next=page.getByRole('button',{name:/^(Skip|Continue)$/});if(!await next.count())break;await next.first().click();
 }
 await expect(page.getByRole('heading',{name:'Report card',exact:true})).toBeVisible();
 await expect(page.getByTestId('next-step-card')).toHaveCount(0);
 await page.screenshot({path:'/tmp/month-review/report.png'});
 fs.writeFileSync('/tmp/month-review/trace.txt',trace.join('\n'));
 expect(trace.some(t=>t.includes('What changed, and why'))).toBe(true);
 expect(trace.some(t=>t.includes('You chose:'))).toBe(true);
});

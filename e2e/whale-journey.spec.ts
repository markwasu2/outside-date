import {test,expect} from '@playwright/test';
import fs from 'node:fs';
test('Whale fresh setup to ending follows visible guidance using real clicks',async({page})=>{
 test.setTimeout(240_000);await page.setViewportSize({width:1440,height:900});await page.addInitScript(()=>{Math.random=()=>1/1_000_000_000;});
 const trace:string[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('select').first().selectOption('whale');await page.getByRole('button',{name:'New game',exact:true}).click();
 for(const name of ['Next: Hall tier','Next: Cooling','Next: Contractor','Next: Lease','Next: Forecast','Next: Capital stack','Next: Power','Next: Insurance','Review closing table'])await page.getByRole('button',{name,exact:true}).click();
 await page.getByRole('button',{name:'Start campaign',exact:true}).click();
 for(let month=0;month<100;month++){
  if(await page.getByRole('heading',{name:/Rating the campus|Report card|You lose|You win|You scraped by/}).count())break;
  if(await page.getByTestId('event-choice').count()){
   const choices=page.getByTestId('event-choice');let choice=choices.first();
   const no=choices.filter({hasText:/Say no|Decline|Keep the current/});if(await no.count())choice=no.first();
   trace.push('EVENT '+await choice.innerText());await choice.click();continue;
  }
  trace.push((await page.getByTestId('campus-status').innerText()).replaceAll('\n',' '));
  while(await page.getByTestId('event-notice-dismiss').count())await page.getByTestId('event-notice-dismiss').first().click();
  for(let instruction=0;instruction<8;instruction++){
   const title=await page.getByTestId('next-step-card').innerText();trace.push(title.replaceAll('\n',' '));if(await page.getByTestId('next-step-show-me').innerText()==='Why wait?'){await page.getByTestId('next-step-show-me').click();await expect(page.getByTestId('map-popover')).toHaveCount(0);break;}
   await page.getByTestId('next-step-show-me').click();const popup=page.getByTestId('map-popover');await expect(popup).toBeVisible();
   const rows=popup.getByTestId('popover-action');let chosen=false;
   for(let i=0;i<await rows.count();i++){
    const row=rows.nth(i);if(!await row.isEnabled())continue;const name=await row.innerText();
    const match=title.includes('Commission')&&name.startsWith('Commission')||title.includes('Order the transformer')&&name.startsWith('Order the transformer')||title.includes('Order the switchgear')&&name.startsWith('Order the switchgear')||title.includes('File the ')&&name.startsWith('File')&&(title.includes('docket')?name.includes('docket'):['air','water','wetlands','building'].some(p=>title.includes(p+' permit')&&name.includes(p+' permit')))||title.includes('Option the site')&&name.startsWith('Option the site')||title.includes('Meet ')&&name.startsWith('Meet ')&&title.includes(name.split(' (')[0])||title.includes('Prepare testimony')&&name.startsWith('Prepare testimony')||title.includes('Answer the discovery')&&name.startsWith('Answer')||(title.includes('Advance construction')||title.includes('Start commissioning'))&&/Break ground|Advance construction:|Start commissioning:/.test(name)||title.includes('Cure the lender')&&name.startsWith('Cure')||title.includes('Fix the failed inspection')&&name.startsWith('Fix inspection');
    if(match){trace.push('PLAN '+name.replaceAll('\n',' '));await row.click();chosen=true;break;}
   }
   await popup.getByRole('button',{name:'Close',exact:true}).click();if(!chosen)break;
  }
  if([0,15,30,45].includes(month))await page.screenshot({path:`docs/screenshots/cold2/whale-journey-${month}.png`});
  if(await page.getByTestId('price-takeout-banner').count()){trace.push('PRICE TAKEOUT');await page.getByTestId('price-takeout-banner').click();break;}
  await page.getByRole('button',{name:'End month',exact:true}).click();
 }
 for(let i=0;i<6;i++){const button=page.getByRole('button',{name:/^(Skip|Continue)$/});if(!await button.count())break;await button.first().click();}
 await expect(page.getByRole('heading',{name:/Report card|You lose|You win|You scraped by/}).first()).toBeVisible();expect(trace.some(t=>t.startsWith('PLAN Option the site'))).toBe(true);
 expect(trace).toContain('PRICE TAKEOUT');
 await expect(page.getByRole('heading',{name:'Report card',exact:true})).toBeVisible();
 await expect(page.locator('body')).toContainText('4/4 halls delivered');
 trace.push('END '+await page.locator('body').innerText());fs.writeFileSync('/tmp/whale-journey-trace.txt',trace.join('\n'));await page.screenshot({path:'docs/screenshots/cold2/whale-journey-report.png'});expect(errors).toEqual([]);
});

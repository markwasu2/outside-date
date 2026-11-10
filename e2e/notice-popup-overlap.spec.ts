import {test,expect} from '@playwright/test';
test('a lender notice never covers the office popup when the player follows its cure',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Tutorial',exact:true}).click();
 await page.evaluate(async()=>{
  const {useStore}=await import('/src/ui/store.ts');const old=useStore.getState().state;
  const s={...old,flags:{...old.flags,drawFreeze:true},log:[...old.log,{month:0,kind:'warning' as const,text:'Lender draw freeze: construction draws are paused until you cure it (Money tab).'}]};
  useStore.setState({state:s,draft:s});
 });
 await expect(page.getByTestId('event-notice')).toContainText('site office: Insurance & lender');
 await page.getByTestId('next-step-show-me').click();await expect(page.getByTestId('event-notice')).toHaveCount(0);
 const popup=page.getByTestId('map-popover');await expect(popup.getByRole('button',{name:'Close',exact:true})).toBeInViewport();
 await expect(popup.getByTestId('popover-action').filter({hasText:'Cure a draw freeze'})).toBeEnabled();
 await page.screenshot({path:'docs/screenshots/cold2/live-replay-notice-clear.png'});
});

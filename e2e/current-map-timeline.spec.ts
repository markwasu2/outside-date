import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('Coming up omits completed work and preserves genuinely pending dates',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByTestId('start-first-campus').click();
 await page.evaluate(async()=>{
 // @ts-expect-error display fixture
 const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);s.month=5;s.halls.push({...structuredClone(s.halls[0]),id:'H2',delivered:false,deliveryMonth:12,outsideMonth:18});s.halls[0].delivered=true;s.halls[0].deliveredMonth=4;s.halls[0].deliveryMonth=6;s.halls[0].outsideMonth=8;s.power.studyStatus='done';s.power.studyDoneMonth=7;s.permits.building.status='granted';s.permits.building.decisionMonth=9;s.permits.water.status='pending';s.permits.water.decisionMonth=10;useStore.setState({state:s,draft:s,plan:[]});
 });const timeline=page.getByTestId('simple-timeline');await expect(timeline).not.toContainText('H1 opening');await expect(timeline).not.toContainText('H1 final deadline');await expect(timeline).not.toContainText('study');await expect(timeline).not.toContainText('building permit');await expect(timeline).toContainText('water permit');await expect(timeline).toContainText('H2 opening');await page.screenshot({path:'/tmp/current-timeline-pending.png'});
});

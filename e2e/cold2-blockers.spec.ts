import { expect, test } from '@playwright/test';

test('RFS nudge names the power blocker and automatic substation chain', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('quick-start').click();
  await page.evaluate(async () => {
    const { useStore } = await import('/src/ui/store.ts');
    const s = useStore.getState();
    const next = structuredClone(s.state);
    next.power.studyStatus = 'done'; next.flags.siteOptioned = true; next.docket.status = 'approved';
    for (const p of Object.values(next.permits)) (p as { status: string }).status = 'granted';
    next.power.orders = [
      { kind: 'transformer', orderedMonth: 0, arrivalMonth: 40, deposit: 0, price: 0, arrived: false, supplier: 'standard' },
      { kind: 'switchgear', orderedMonth: 0, arrivalMonth: 30, deposit: 0, price: 0, arrived: true, supplier: 'standard' },
    ];
    for (const h of next.halls) { h.stageIndex = 4; h.stageActive = false; h.energized = false; }
    useStore.setState({ state: next, draft: next, seenExplainers: ['cash','runway','ap','nextOutsideDate','dscrHeadroom','goodwill'] });
  });
  await expect(page.getByTestId('next-step-card').getByText('Next: H1: waiting on power hookup', { exact: true })).toBeVisible();
  await page.getByTestId('next-step-card').getByRole('button',{name:'Next: H1: waiting on power hookup',exact:true}).click();
  await expect(page.getByText(/The substation builds itself once/)).toBeVisible();
  await expect(page.getByTestId('map-popover')).toHaveCount(0);
  await expect(page.getByTestId('next-step-card')).toContainText('transformer arrives Y4 M5');
  await expect(page.getByTestId('next-step-show-me')).toHaveText('Why wait?');
  await page.screenshot({ path: 'docs/screenshots/cold2/power-equipment-clock.png' });
  // The real object still exposes supplier options when the player chooses to inspect them.
  await page.locator('[data-campus-object="substation"]').click();
  await expect(page.getByTestId('map-popover')).toBeVisible();
  await page.getByTestId('map-popover').getByRole('button',{name:'Close',exact:true}).click();
  await page.evaluate(async()=>{
    const {useStore}=await import('/src/ui/store.ts');const s=structuredClone(useStore.getState().state);
    s.power.substationStatus='building';s.power.substationDoneMonth=42;useStore.setState({state:s,draft:s});
  });
  await page.getByTestId('next-step-show-me').click();
  if(!await page.getByTestId('next-step-card').getByText(/Substation construction is underway/).count())await page.getByTestId('next-step-show-me').click();
  await expect(page.getByTestId('next-step-card')).toContainText('Substation construction is underway until Y4 M7');
  await expect(page.getByTestId('map-popover')).toHaveCount(0);
  await page.screenshot({ path: 'docs/screenshots/cold2/power-construction-clock.png' });
});

test('event body and buttons paint above every map label', async ({ page }) => {
  await page.goto('/'); await page.getByTestId('quick-start').click();
  await page.evaluate(async () => {
    const { useStore } = await import('/src/ui/store.ts');
    const s = useStore.getState();
    const card = s.content.events.find((c) => c.id === 'governor_visit')!;
    const next = { ...s.state, phase: 'awaitingChoice', pending: { cardId: card.id, choices: card.choices } };
    useStore.setState({ state: next, draft: next });
  });
  const dialog = page.getByRole('dialog').filter({ has: page.getByTestId('event-choice-commit') });
  const button = dialog.getByTestId('event-choice-commit');
  await expect(button).toBeVisible();
  const onTop = await button.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  });
  expect(onTop).toBe(true);
  await page.screenshot({ path: 'docs/screenshots/cold2/modal-layer.png' });
  await button.click(); await expect(dialog).toHaveCount(0);
});

test('racks modal shows the real retrofit price and delay before either choice', async ({ page }) => {
  await page.goto('/'); await page.getByTestId('quick-start').click();
  await page.evaluate(async () => {
    const { useStore } = await import('/src/ui/store.ts'); const s = useStore.getState();
    const card = s.content.events.find((c) => c.id === 'chip_generation')!;
    const next = { ...s.state, phase: 'awaitingChoice', pending: { cardId: card.id, choices: [{ id:'retrofit',label:'Retrofit' },{ id:'decline',label:'Decline' }] } };
    useStore.setState({state:next,draft:next});
  });
  const dialog = page.getByRole('dialog').filter({ has: page.getByTestId('event-choice') });
  await expect(dialog).toContainText('Costs $15.0M per undelivered hall, no added fitout delay');
  await expect(dialog).toContainText('Tenant goodwill -15, asset score -3');
  await page.screenshot({ path: 'docs/screenshots/cold2/rack-stakes.png' });
  await page.evaluate(async () => {
    const { useStore } = await import('/src/ui/store.ts'); const s = useStore.getState();
    const next = {...s.state,setup:{...s.state.setup,hallTier:'liquid'}};
    useStore.setState({state:next,draft:next});
  });
  await expect(dialog).toContainText('Costs $4.0M per undelivered hall; +1 month of remaining fitout. Finished fitout is not delayed.');
});

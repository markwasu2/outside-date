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
  await expect(page.getByText(/The substation builds itself once/)).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/cold2/real-blocker.png' });
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
  const dialog = page.getByRole('dialog').filter({ has: page.getByTestId('event-choice') });
  const button = dialog.getByTestId('event-choice').first();
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
  await expect(dialog).toContainText('Costs $4.0M per undelivered hall, +1 fitout month on each');
});

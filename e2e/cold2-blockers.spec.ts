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
  await expect(page.getByText('H1: waiting on power hookup', { exact: true })).toBeVisible();
  await expect(page.getByText(/The substation builds itself once/)).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/cold2/real-blocker.png' });
});

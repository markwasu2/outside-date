import { test, expect } from '@playwright/test';
test.use({ storageState: { cookies: [], origins: [] } });
test('world camera keeps blocked, paused, failed and terminal hall display semantics', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByTestId('start-first-campus').click();
  const cases = [
    'permit',
    'frozen',
    'failed',
    'terminated',
    'delivered',
    'late',
    'liquid',
  ] as const;
  for (const scenario of cases) {
    await page.evaluate(async (scenario) => {
      const { useStore } = await import('/src/ui/store.ts');
      const current = useStore.getState();
      const s = structuredClone(current.draft);
      s.flags.siteOptioned = true;
      s.flags.drawFreeze = false;
      s.flags.outOfBalance = false;
      delete s.flags['inspectionFail:H1'];
      s.setup.hallTier = 'air';
      s.permits.building.status = 'none';
      s.permits.air.status = 'granted';
      s.permits.water.status = 'granted';
      s.power.substationStatus = 'done';
      while (s.halls.length < 4)
        s.halls.push({ ...structuredClone(s.halls[0]), id: `H${s.halls.length + 1}` });
      s.halls.forEach((h) => {
        h.stageIndex = 1;
        h.stageActive = false;
        h.stageMonthsDone = 1;
        h.terminated = false;
        h.delivered = false;
        h.pausedThisMonth = false;
        h.liquidReady = false;
        h.energized = true;
        h.outsideMonth = 99;
      });
      const h = s.halls[0]!;
      if (scenario === 'frozen') {
        h.stageActive = true;
        s.flags.drawFreeze = true;
      }
      if (scenario === 'failed') {
        h.stageActive = true;
        s.flags['inspectionFail:H1'] = true;
      }
      if (scenario === 'terminated') {
        h.terminated = true;
        h.stageActive = false;
        h.outsideMonth = -1;
      }
      if (scenario === 'delivered') {
        h.stageIndex = 5;
        h.delivered = true;
        h.deliveredMonth = 0;
        h.outsideMonth = -1;
      }
      if (scenario === 'late') {
        h.outsideMonth = -1;
      }
      if (scenario === 'liquid') {
        h.stageIndex = 4;
        s.setup.hallTier = 'liquid';
      }
      localStorage.setItem('outside-date-world-campus-preview', 'false');
      useStore.setState({ state: s, draft: s, plan: [] });
    }, scenario);
    const read = async () => {
      const hall = page.locator('[data-hall-id=H1]');
      return {
        caption: await page.getByTestId('caption-H1').innerText(),
        blocked: await hall.getAttribute('data-blocked'),
        machines: await hall.getByTestId('stage-vehicle').count(),
        rent: await hall.getByTestId('rent-ticker').count(),
        paused: await hall.getByLabel('Paused', { exact: true }).count(),
        late: await hall.getByLabel('Late', { exact: true }).count(),
        failed: await hall.getByLabel('Failed inspection', { exact: true }).count(),
        terminated: await hall.getByLabel('Terminated', { exact: true }).count(),
        control: await hall
          .locator('[data-map-control] button')
          .evaluateAll((es) =>
            es
              .map((e) => e.parentElement?.getAttribute('data-control-action'))
              .filter((a) => a !== 'inspect'),
          ),
      };
    };
    const original = await read();
    await page.evaluate(async () => {
      const { useStore } = await import('/src/ui/store.ts');
      localStorage.setItem('outside-date-world-campus-preview', 'true');
      useStore.setState((s) => ({ draft: structuredClone(s.draft) }));
    });
    await expect(page.getByTestId('map-root')).toHaveAttribute('data-world-camera', 'true');
    expect(await read()).toEqual(original);
    if (['frozen', 'failed', 'terminated'].includes(scenario))
      await expect(page.locator('[data-hall-id=H1]').getByTestId('stage-vehicle')).toHaveCount(0);
    if (['terminated', 'delivered'].includes(scenario))
      await expect(
        page.locator('[data-hall-id=H1]').getByLabel('Late', { exact: true }),
      ).toHaveCount(0);
    if (scenario === 'liquid')
      await expect(page.getByTestId('caption-H1')).toContainText('liquid cooling');
    await page.screenshot({ path: `/tmp/world-parity-${scenario}.png` });
  }
});

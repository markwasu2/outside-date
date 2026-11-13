import { test, expect } from '@playwright/test';
test.use({ storageState: { cookies: [], origins: [] } });
for (const count of [1, 4, 6])
  test(`${count}-hall developed grounds stay below building art and roads`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.getByTestId('start-first-campus').click();
    await expect(page.getByTestId('campus-grounds-layer')).toHaveCount(0);
    await page.evaluate(async (count) => {
      // @ts-expect-error visual fixture
      const { useStore } = await import('/src/ui/store.ts');
      const s = structuredClone(useStore.getState().draft);
      s.flags.siteOptioned = true;
      while (s.halls.length < count)
        s.halls.push({ ...structuredClone(s.halls[0]), id: `H${s.halls.length + 1}` });
      s.halls.forEach((h: { stageIndex: number; delivered: boolean; energized: boolean }) => {
        h.stageIndex = 5;
        h.delivered = true;
        h.energized = true;
      });
      useStore.setState({ state: s, draft: s, plan: [] });
    }, count);
    const ground = page.getByTestId('world-ground');
    await expect(ground).toBeVisible();
    await expect(ground).toHaveCSS('pointer-events', 'none');
    await expect(page.getByTestId('world-hall-apron')).toHaveCount(count);
    await expect(page.getByTestId('world-parking')).toBeVisible();
    await expect(page.getByTestId('parked-campus-car')).toHaveCount(3);
    await expect(page.getByTestId('campus-entry')).toBeVisible();
    await expect(page.getByTestId('road-freight-vehicle')).toBeVisible();
    await expect(page.getByTestId('road-passenger-vehicle')).toBeVisible();
    for (let i = 1; i <= count; i++)
      await expect(page.locator(`[data-map-control=H${i}] button`)).toContainText('Open for rent');
    await page.screenshot({ path: `/tmp/developed-grounds-${count}-day.png` });
    await page.getByRole('button', { name: 'Night view', exact: true }).click();
    await expect(page.getByTestId('world-night-pools')).toBeVisible();
    await expect(page.getByTestId('road-truck-headlights')).toBeVisible();
    await page.screenshot({ path: `/tmp/developed-grounds-${count}-night.png` });
  });

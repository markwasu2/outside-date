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
    if (count > 1) {
      const ground = page.getByTestId('world-ground');
      await expect(ground).toBeVisible();
      await expect(ground).toHaveCSS('pointer-events', 'none');
      await expect(page.getByTestId('world-hall-apron')).toHaveCount(count);
      await expect(page.getByTestId('world-parking')).toBeVisible();
      await expect(page.getByTestId('parked-campus-car')).toHaveCount(3);
      await expect(page.getByTestId('world-gatehouse')).toBeVisible();
      await expect(page.getByTestId('road-freight-vehicle')).toBeVisible();
      await expect(page.getByTestId('road-passenger-vehicle')).toBeVisible();
      for (let i = 1; i <= count; i++)
        await expect(page.locator(`[data-map-control=H${i}] button`)).toContainText(
          'Open for rent',
        );
      await page.screenshot({ path: `/tmp/developed-grounds-${count}-day.png` });
      await page.getByRole('button', { name: 'Night view', exact: true }).click();
      await expect(page.getByTestId('world-night-pools')).toBeVisible();
      await expect(page.getByTestId('road-truck-headlights')).toBeVisible();
      await page.screenshot({ path: `/tmp/developed-grounds-${count}-night.png` });
      return;
    }
    const layer = page.getByTestId('campus-grounds-layer');
    await expect(layer).toBeVisible();
    await expect(layer).toHaveCSS('z-index', '0');
    await expect(layer.getByTestId('court-edge-detail')).toBeVisible();
    await expect(layer.getByTestId('utility-service-markings')).toBeVisible();
    await expect(layer).toHaveCSS('pointer-events', 'none');
    await expect(page.getByTestId('campus-compound')).toHaveCSS('z-index', '2');
    await expect(layer.locator('pattern path')).toHaveAttribute('fill', 'none');
    await expect(page.locator('[data-hall-id]')).toHaveCount(count);
    for (let i = 1; i <= count; i++) {
      const sign = page.getByTestId(`hall-sign-H${i}`);
      await expect(sign).toBeVisible();
      await expect(sign).toHaveCSS('color', 'rgb(255, 249, 232)');
      await expect(sign).toHaveCSS('pointer-events', 'none');
    }
    const cars = page.getByTestId('parked-campus-car');
    await expect(cars).toHaveCount(3);
    const positions = await cars.evaluateAll((items) =>
      items.map((el) => el.getAttribute('transform')),
    );
    expect(positions).toEqual(['translate(931 630)', 'translate(1019 651)', 'translate(931 673)']);
    await expect(page.getByTestId('campus-life').locator('svg > g')).toHaveCount(2);
    await page.screenshot({ path: `/tmp/developed-grounds-${count}-day.png` });
    await page.getByRole('button', { name: 'Night view', exact: true }).click();
    await expect(layer).toHaveCSS('filter', 'brightness(0.6) saturate(0.8)');
    await page.screenshot({ path: `/tmp/developed-grounds-${count}-night.png` });
  });

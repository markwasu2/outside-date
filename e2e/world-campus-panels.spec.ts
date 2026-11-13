import { test, expect } from '@playwright/test';
test.use({ storageState: { cookies: [], origins: [] } });
for (const count of [4, 6])
  test(`world ${count}-hall controls, receipts and zoomed panels remain usable`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() =>
      localStorage.setItem('outside-date-world-campus-preview', 'true'),
    );
    await page.goto('/');
    await page.getByTestId('start-first-campus').click();
    await page.evaluate(async (count) => {
      const { useStore } = await import('/src/ui/store.ts');
      const s = structuredClone(useStore.getState().draft);
      while (s.halls.length < count)
        s.halls.push({ ...structuredClone(s.halls[0]!), id: `H${s.halls.length + 1}` });
      useStore.setState({ state: s, draft: s, plan: [] });
    }, count);
    await page.locator('[data-map-control=road] button').click();
    const direct = page.locator('[data-map-control=H1] button');
    await expect(direct.locator('small')).toContainText('point');
    await expect(direct.locator('small')).toContainText('costs paid as built');
    await page.screenshot({ path: `/tmp/world-cost-${count}.png` });
    await page.locator('[data-map-control=H1] button').click();
    await page.locator('[data-map-control=H2] button').click();
    const receipt = page.getByTestId('build-receipt');
    await expect(receipt).toContainText('H2: Build foundation');
    const r = await receipt.boundingBox();
    for (let n = 1; n <= count; n++) {
      const c = await page.locator(`[data-map-control=H${n}] button`).boundingBox();
      expect(
        r!.x + r!.width <= c!.x ||
          r!.x >= c!.x + c!.width ||
          r!.y + r!.height <= c!.y ||
          r!.y >= c!.y + c!.height,
      ).toBe(true);
    }
    await page.screenshot({ path: `/tmp/world-receipt-${count}.png` });
    await page.getByTestId('world-zoom').click();
    const scroll = page.getByTestId('world-camera-scroll');
    await scroll.evaluate((e) => {
      e.scrollTop = e.scrollHeight;
      e.scrollLeft = e.scrollWidth;
    });
    const buttons = [
      page.locator('[data-map-control=siteOffice] button'),
      page.locator('[data-map-control=substation] button'),
      page.getByRole('button', { name: 'Water permits', exact: true }),
      page.getByRole('button', { name: 'Deliveries', exact: true }),
      page.getByRole('button', { name: 'Power plants', exact: true }),
      page.getByRole('button', { name: 'Crew and contacts', exact: true }),
      page.getByRole('button', { name: 'Inspect H1', exact: true }),
      page.getByRole('button', { name: 'Money', exact: true }),
    ];
    for (let i = 0; i < buttons.length; i++) {
      await buttons[i]!.click();
      const panel = page.getByTestId('simple-object-panel');
      await expect(panel).toBeVisible();
      const p = await panel.boundingBox(),
        m = await page.getByTestId('map-root').boundingBox();
      expect(p!.x).toBeGreaterThanOrEqual(m!.x);
      expect(p!.y).toBeGreaterThanOrEqual(m!.y);
      expect(p!.x + p!.width).toBeLessThanOrEqual(m!.x + m!.width);
      expect(p!.y + p!.height).toBeLessThanOrEqual(m!.y + m!.height);
      await page.screenshot({ path: `/tmp/world-panel-${count}-${i}.png` });
      await panel.getByRole('button', { name: 'Close', exact: true }).click();
    }
    await page.getByTestId('world-zoom').click();
    await page.getByTestId('simple-next-month').click();
    await expect(receipt).toHaveCount(0);
  });

import { test, expect } from '@playwright/test';
test.use({ storageState: { cookies: [], origins: [] } });
for (const width of [1024, 1280])
  test(`closing still keeps hall axes and final states at desktop ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    await page.goto('/');
    await page.getByTestId('start-first-campus').click();
    for (const count of [1, 2, 3, 4, 5, 6]) {
      await page.evaluate(async (count) => {
        const { useStore } = await import('/src/ui/store.ts');
        const s = structuredClone(useStore.getState().draft);
        const template = s.halls[0]!;
        s.flags.siteOptioned = true;
        s.halls = Array.from({ length: count }, (_, i) => ({
          ...structuredClone(template),
          id: `H${i + 1}`,
          stageIndex: i % 3 === 0 ? -1 : i % 3 === 1 ? 1 : 5,
          stageActive: i % 3 === 1,
          stageMonthsDone: 1,
          delivered: i % 3 === 2,
          terminated: i === count - 1 && count > 1,
        }));
        s.phase = 'ended';
        s.outcome = { kind: 'lose', reason: 'equityWiped' };
        useStore.setState({ state: s, draft: s, screen: 'reportCard', plan: [] });
      }, count);
      const camera = await page.getByTestId('result-world-camera').boundingBox();
      await expect(page.getByTestId('result-hall')).toHaveCount(count);
      await expect(page.getByTestId('result-ground-footprint')).toHaveCount(count);
      await expect(page.getByTestId('result-campus').getByTestId('stage-vehicle')).toHaveCount(0);
      for (const hall of await page.getByTestId('result-hall').all()) {
        const b = await hall.boundingBox();
        expect(b!.x).toBeGreaterThanOrEqual(camera!.x);
        expect(b!.y).toBeGreaterThanOrEqual(camera!.y);
        expect(b!.x + b!.width).toBeLessThanOrEqual(camera!.x + camera!.width);
        expect(b!.y + b!.height).toBeLessThanOrEqual(camera!.y + camera!.height);
        expect(b!.width / b!.height).toBeCloseTo(300 / 242, 2);
        const id = await hall.getAttribute('data-hall-id');
        await expect(hall.getByRole('img')).toHaveAttribute('aria-label', new RegExp(`^${id}:`));
      }
      const statuses = page.getByTestId('result-hall-statuses');
      await expect(statuses).toContainText('No foundation started');
      if (count > 1) await expect(statuses).toContainText('Tenant left');
      await expect(page.getByRole('button', { name: 'Play again', exact: true })).toBeInViewport();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <= innerWidth &&
            document.documentElement.scrollHeight <= innerHeight,
        ),
      ).toBe(true);
      await page.screenshot({ path: `/tmp/closing-world-${count}-${width}.png` });
    }
  });

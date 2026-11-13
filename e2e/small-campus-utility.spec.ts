import { test, expect } from '@playwright/test';
test.use({ storageState: { cookies: [], origins: [] } });
for (const width of [1024, 1280])
  for (const count of [2, 3])
    test(`${count}-hall finished utility yard fits owned ground at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 720 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      await page.getByTestId('start-first-campus').click();
      await page.evaluate(async (count) => {
        const { useStore } = await import('/src/ui/store.ts');
        const s = structuredClone(useStore.getState().draft);
        s.flags.siteOptioned = true;
        s.power.substationStatus = 'done';
        while (s.halls.length < count)
          s.halls.push({ ...structuredClone(s.halls[0]!), id: `H${s.halls.length + 1}` });
        s.halls.forEach((h) => {
          h.stageIndex = 5;
          h.stageActive = false;
          h.delivered = true;
          h.energized = true;
        });
        useStore.setState({ state: s, draft: s, plan: [] });
      }, count);
      await expect(page.getByTestId('map-root')).toHaveAttribute('data-world-camera', 'true');
      await expect(page.getByTestId('support-yard')).toContainText('Backup units');
      await page
        .getByTestId('support-yard')
        .locator('img')
        .evaluateAll((imgs) => Promise.all(imgs.map((img) => (img as HTMLImageElement).decode())));
      const ground = await page.getByTestId('map-root').boundingBox(),
        backup = await page.getByTestId('support-work-equipment').boundingBox();
      expect(ground && backup).toBeTruthy();
      expect(backup!.y + backup!.height).toBeLessThan(ground!.y + ground!.height);
      await page.screenshot({ path: `/tmp/small-utility-${count}-${width}-day.png` });
      await page.getByTestId('night-view').click();
      await page.screenshot({ path: `/tmp/small-utility-${count}-${width}-night.png` });
      await page.getByTestId('rent-ticker').first().click();
      await expect(page.getByTestId('rent-income-explanation')).toBeVisible();
    });

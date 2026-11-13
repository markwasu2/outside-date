import { test, expect } from '@playwright/test';
import fixture from './fixtures/power-reserve.json' with { type: 'json' };
test.use({ storageState: { cookies: [], origins: [] } });
// Synthetic saved-state fixture. This checks the camera, not game progression.
for (const width of [1024, 1280])
  for (const count of [1, 3, 6])
    test(`power reserve clears rooted trees for ${count} halls at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 720 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const save = structuredClone(fixture);
      while (save.state.halls.length < count)
        save.state.halls.push({
          ...structuredClone(save.state.halls[0]!),
          id: `H${save.state.halls.length + 1}`,
        });
      save.state.halls = save.state.halls.slice(0, count);
      save.state.power.plants[0]!.plannedOnlineMonth = 2;
      save.state.power.plants[0]!.onlineMonth = null;
      save.state.power.plants[1]!.plannedOnlineMonth = 0;
      save.state.power.plants[1]!.onlineMonth = 0;
      await page.addInitScript(
        (save) => localStorage.setItem('outside-date-save', JSON.stringify(save)),
        save,
      );
      await page.goto('/');
      await page.getByRole('button', { name: 'Continue saved game', exact: true }).click();
      await expect(page.getByTestId('map-root')).toHaveAttribute('data-world-camera', 'true');
      await expect(page.getByTestId('plant-buildout-A')).toHaveAttribute(
        'data-build-state',
        'building',
      );
      await expect(page.getByTestId('plant-buildout-B')).toHaveAttribute(
        'data-build-state',
        'online',
      );
      await page
        .locator('[data-scene-object="plants"] img')
        .evaluateAll((imgs) => Promise.all(imgs.map((img) => (img as HTMLImageElement).decode())));
      // Invert the shared orthographic camera to check actual rendered root anchors,
      // including the roots hidden behind the HTML equipment layer.
      const columns = count > 3 ? Math.ceil(count / 2) : count,
        rows = count > 3 ? 2 : 1;
      const right = columns * 210 + 160,
        bottom = Math.max(275, rows * 180 - 30);
      const minX = (-260 - bottom) * 0.866 - 50,
        utility = columns * 210 + 65;
      const roots = await page
        .getByTestId('world-woodland')
        .locator('[data-tree-root-x]')
        .evaluateAll((els) =>
          els.map((el) => ({
            x: Number(el.getAttribute('data-tree-root-x')),
            y: Number(el.getAttribute('data-tree-root-y')),
          })),
        );
      expect(roots.length).toBeGreaterThan(10);
      for (const root of roots) {
        const delta = (root.x + minX) / 0.866,
          sum = (root.y - 220) * 2;
        const x = (sum + delta) / 2,
          y = (sum - delta) / 2;
        expect(
          x >= utility - 50 - 0.01 &&
            x <= utility + 300 + 0.01 &&
            y >= -190 - 0.01 &&
            y <= -90 + 0.01,
        ).toBe(false);
        if (Math.abs(x - (right + 65)) < 0.01) expect(y).toBeGreaterThanOrEqual(9.99);
      }
      await page.screenshot({ path: `/tmp/power-tree-clear-${count}-${width}-day.png` });
      await page.getByTestId('night-view').click();
      await page.screenshot({ path: `/tmp/power-tree-clear-${count}-${width}-night.png` });
      await page.locator('[data-scene-object="plants"] button').click();
      await expect(page.getByTestId('simple-object-panel')).toBeVisible();
    });

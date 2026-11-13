import { test, expect } from '@playwright/test';
import fixture from './fixtures/power-reserve.json' with { type: 'json' };
test.use({ storageState: { cookies: [], origins: [] } });
// Synthetic saved-state camera check, not campaign progression.
for (const width of [1024, 1280])
  for (const [scenario, site, theme, poles] of [
    ['first-campus', 'edge5-campus', 'campus', 2],
    ['first-campus', 'edge5-siding', 'depot', 3],
    ['whale', 'quarry-ridge', 'quarry', 4],
  ] as const)
    test(`${theme} single-hall poles clear power equipment at ${width}`, async ({ page }) => {
      const save = structuredClone(fixture);
      save.state.scenarioId = scenario;
      save.state.setup.site = site;
      save.state.halls = save.state.halls.slice(0, 1);
      save.state.docketEnabled = true;
      save.state.power.plants.forEach((p) => {
        p.onlineMonth = 0;
        p.plannedOnlineMonth = 0;
      });
      await page.setViewportSize({ width, height: 720 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript(
        (save) => localStorage.setItem('outside-date-save', JSON.stringify(save)),
        save,
      );
      await page.goto('/');
      await page.getByRole('button', { name: 'Continue saved game', exact: true }).click();
      await expect(page.getByTestId('map-root')).toHaveAttribute('data-terrain', theme);
      await expect(page.getByTestId('world-power-pole')).toHaveCount(poles);
      for (const pole of await page.getByTestId('world-power-pole').all()) {
        expect(Number(await pole.getAttribute('data-world-x'))).toBeLessThanOrEqual(185);
        expect(Number(await pole.getAttribute('data-world-x'))).toBeGreaterThanOrEqual(-40);
        await expect(pole).toHaveAttribute('data-world-y', '-158');
      }
      await expect(page.getByTestId('map-substation')).toHaveAttribute('data-build-state', 'done');
      await page
        .locator('[data-scene-object="plants"] img')
        .evaluateAll((imgs) => Promise.all(imgs.map((img) => (img as HTMLImageElement).decode())));
      await page.screenshot({ path: `/tmp/pole-clear-${theme}-${width}-day.png` });
      await page.getByTestId('night-view').click();
      await page.screenshot({ path: `/tmp/pole-clear-${theme}-${width}-night.png` });
      await page.locator('[data-map-control=substation] button').click();
      await expect(page.getByTestId('simple-object-panel')).toBeVisible();
    });

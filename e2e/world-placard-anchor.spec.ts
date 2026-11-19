import { test, expect } from '@playwright/test';
import fixture from './fixtures/power-reserve.json' with { type: 'json' };
test.use({ storageState: { cookies: [], origins: [] } });
// Each hall's status placard belongs to its own building: anchored at the down-right rect
// corner (left 62%), the pill landed on the next hall's art and read as its label. The pill
// now centers on its own hall's rect, with the rent ticker centered under the pill.
for (const width of [1024, 1280])
  for (const count of [1, 3, 6])
    test(`hall placard centers on its own hall for ${count} halls at ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 720 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const save = structuredClone(fixture);
      while (save.state.halls.length < count)
        save.state.halls.push({
          ...structuredClone(save.state.halls[0]!),
          id: `H${save.state.halls.length + 1}`,
        });
      save.state.halls = save.state.halls.slice(0, count);
      if (count > 1) {
        const h2 = save.state.halls[1]!;
        h2.stageIndex = 2;
        h2.stageActive = true;
        h2.delivered = false;
        h2.energized = false;
      }
      await page.addInitScript(
        (save) => localStorage.setItem('outside-date-save', JSON.stringify(save)),
        save,
      );
      await page.goto('/');
      await page.getByRole('button', { name: 'Continue saved game', exact: true }).click();
      await expect(page.getByTestId('map-root')).toHaveAttribute('data-world-camera', 'true');
      const rows = await page.evaluate(() =>
        [...document.querySelectorAll('[data-hall-id]')].map((el) => {
          const rect = el.getBoundingClientRect();
          const pill = el.querySelector('[data-world-hall-placard] [data-map-control]');
          const ticker = el.querySelector('[data-testid="rent-ticker"]');
          const p = pill?.getBoundingClientRect();
          const t = ticker?.getBoundingClientRect();
          return {
            id: el.getAttribute('data-hall-id'),
            cx: rect.x + rect.width / 2,
            w: rect.width,
            bottom: rect.y + rect.height,
            pill: p ? { cx: p.x + p.width / 2, top: p.y, bottom: p.y + p.height } : null,
            ticker: t ? { cx: t.x + t.width / 2 } : null,
          };
        }),
      );
      expect(rows.length).toBe(count);
      for (const row of rows) {
        expect(row.pill, `${row.id} placard pill`).not.toBeNull();
        // The pill centers on its own hall's rect (within 12% of the rect width) and sits
        // at the building's base, below 80% of the rect height.
        expect(
          Math.abs(row.pill!.cx - row.cx),
          `${row.id} pill off its hall center`,
        ).toBeLessThanOrEqual(row.w * 0.12);
        expect(row.pill!.top).toBeGreaterThan(row.bottom - row.w * 0.35);
        if (row.ticker)
          expect(
            Math.abs(row.ticker.cx - row.pill!.cx),
            `${row.id} rent ticker off its pill`,
          ).toBeLessThanOrEqual(6);
      }
      await page.screenshot({ path: `/tmp/placard-anchor-${count}-${width}.png` });
    });

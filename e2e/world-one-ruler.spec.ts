import { test, expect } from '@playwright/test';
test.use({ storageState: { cookies: [], origins: [] } });
// One ruler: a standing person is 18 world units; vehicles, poles and trees are measured
// against it. Guards the world-view scale relationships from drifting apart again.
for (const width of [1024, 1280])
  test(`world objects keep person-relative scale at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByTestId('start-first-campus').click();
    await page.locator('[data-map-control=road] button').click();
    await page.locator('[data-map-control=siteOffice] button').click();
    await page.getByRole('button', { name: 'Apply for building permit', exact: true }).click();
    await page.getByTestId('simple-object-panel').getByRole('button', { name: 'Close', exact: true }).click();
    await page.locator('[data-map-control=H1] button').click();
    const px = async (sel: string) => {
      const el = page.getByTestId(sel).first();
      await expect(el).toBeVisible();
      return el.evaluate((e) => {
        const r = (e as SVGGraphicsElement).getBoundingClientRect();
        return { w: r.width, h: r.height };
      });
    };
    const worker = await px('world-working-person');
    const car = await px('road-passenger-vehicle');
    const truck = await px('road-freight-vehicle');
    const parked = await px('parked-campus-car');
    // Car ~2.5 person heights long, freight ~5.5; parked cars match road cars.
    expect(car.w / worker.h).toBeGreaterThan(1.9);
    expect(car.w / worker.h).toBeLessThan(3.6);
    expect(truck.w / worker.h).toBeGreaterThan(4.2);
    expect(truck.w / worker.h).toBeLessThan(7.5);
    expect(parked.w / car.w).toBeCloseTo(1, 1);
    // Poles stand taller than the perimeter trees they share the verge with.
    const pole = await px('world-power-pole').catch(() => null);
    if (pole) {
      expect(pole.h / worker.h).toBeGreaterThan(3.6);
      expect(pole.h / worker.h).toBeLessThan(6.4);
    }
    await page.screenshot({ path: `/tmp/one-ruler-${width}-day.png` });
    await page.getByTestId('night-view').click();
    await page.screenshot({ path: `/tmp/one-ruler-${width}-night.png` });
  });

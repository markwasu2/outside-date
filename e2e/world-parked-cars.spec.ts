import { test, expect } from '@playwright/test';
test.use({ storageState: { cookies: [], origins: [] } });
for (const width of [1024, 1280])
  test(`shared camera parked cars keep upright body height at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByTestId('start-first-campus').click();
    await expect(page.getByTestId('parked-campus-car')).toHaveCount(0);
    await page.locator('[data-map-control=road] button').click();
    await expect(page.getByTestId('parked-campus-car')).toHaveCount(3);
    const cars = page.getByTestId('parked-passenger-body');
    for (const car of await cars.all()) {
      const m = await car.evaluate((el) => {
        const m = (el as SVGGraphicsElement).getScreenCTM()!;
        return { a: m.a, b: m.b, c: m.c, d: m.d };
      });
      expect(Math.hypot(m.a, m.b) / Math.hypot(m.c, m.d)).toBeCloseTo(1, 4);
      await expect(car.getByTestId('passenger-car-body-detail')).toBeVisible();
      await expect(car.locator('ellipse')).toHaveCount(8);
    }
    const parked = await cars.first().boundingBox(),
      moving = await page.getByTestId('road-passenger-vehicle').boundingBox();
    expect(parked && moving).toBeTruthy();
    expect(parked!.width / moving!.width).toBeCloseTo(1, 2);
    expect(parked!.height / moving!.height).toBeCloseTo(1, 2);
    await page.screenshot({ path: `/tmp/world-parked-${width}-day.png` });
    await page.getByTestId('night-view').click();
    await page.screenshot({ path: `/tmp/world-parked-${width}-night.png` });
    await page.getByRole('button', { name: 'Undo last order', exact: true }).click();
    await expect(page.getByTestId('parked-campus-car')).toHaveCount(0);
  });

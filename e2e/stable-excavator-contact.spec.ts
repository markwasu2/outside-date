import { test, expect } from '@playwright/test';
test.use({ storageState: { cookies: [], origins: [] } });
for (const width of [1024, 1280])
  test(`real excavation order keeps tracks planted at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await page.goto('/');
    await page.getByTestId('start-first-campus').click();
    await page.locator('[data-map-control=road] button').click();
    await page.locator('[data-map-control=H1] button').click();
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    const machine = page.getByTestId('stage-vehicle');
    await expect(machine).toHaveAttribute('src', /excavator/);
    await machine.evaluate(async (el) => (el as HTMLImageElement).decode());
    // Let the short order-placement transition settle before checking ground contact.
    await page.waitForTimeout(500);
    const baseline = await machine.boundingBox();
    await expect(machine).toHaveCSS('transform', 'none');
    await expect(machine).toHaveCSS('animation-name', 'none');
    const source = await machine.getAttribute('src');
    const art = await page.evaluate(async (src) => await (await fetch(src!)).text(), source);
    expect(art).toContain('excavator-tracked-undercarriage');
    expect(art).toContain('excavator-digging-bucket');
    await page.screenshot({ path: `/tmp/excavator-fixed-contact-${width}-day.png` });
    await page.waitForTimeout(600);
    expect(await machine.boundingBox()).toEqual(baseline);
    await page.getByTestId('night-view').click();
    await expect(machine).toHaveCSS('transform', 'none');
    await page.screenshot({ path: `/tmp/excavator-fixed-contact-${width}-night.png` });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(machine).toHaveCSS('animation-name', 'none');
    await page.getByRole('button', { name: 'Undo last order', exact: true }).click();
    await expect(machine).toHaveCount(0);
  });

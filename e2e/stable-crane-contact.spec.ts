import { test, expect } from '@playwright/test';
test.use({ storageState: { cookies: [], origins: [] } });
for (const width of [1024, 1280])
  test(`real frame order keeps crane chassis grounded while boom works at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 720 });
    await page.goto('/');
    await page.getByTestId('start-first-campus').click();
    await page.locator('[data-map-control=road] button').click();
    await page.locator('[data-map-control=H1] button').click();
    await page.locator('[data-map-control=siteOffice] button').click();
    await page
      .getByTestId('simple-do-action')
      .filter({ hasText: 'Apply for building permit' })
      .click();
    await page
      .getByTestId('simple-object-panel')
      .getByRole('button', { name: 'Close', exact: true })
      .click();
    for (let month = 0; month < 7; month++) {
      const b = page.locator('[data-map-control=H1] button');
      if (/^Build frame/.test(await b.innerText())) {
        await b.click();
        break;
      }
      await page.getByTestId('simple-next-month').click();
      if (await page.getByTestId('event-scale').count()) {
        await page.getByTestId('event-scale').fill('0');
        await page.getByTestId('event-choice-commit').click();
      }
    }
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    const machine = page.getByTestId('stage-vehicle');
    await expect(machine).toHaveAttribute('src', /crane/);
    await machine.evaluate(async (el) => (el as HTMLImageElement).decode());
    const baseline = await machine.boundingBox();
    await expect(machine).toHaveCSS('transform', 'none');
    await expect(machine).toHaveCSS('animation-name', 'none');
    const source = await machine.getAttribute('src');
    const art = await page.evaluate(async (src) => await (await fetch(src!)).text(), source);
    expect(art).toContain('.crane-boom');
    expect(art).toContain('animation:sway');
    expect(art).toContain('prefers-reduced-motion:reduce');
    await page.screenshot({ path: `/tmp/crane-fixed-contact-${width}-day.png` });
    await page.waitForTimeout(600);
    expect(await machine.boundingBox()).toEqual(baseline);
    await page.getByTestId('night-view').click();
    await expect(machine).toHaveCSS('transform', 'none');
    await page.screenshot({ path: `/tmp/crane-fixed-contact-${width}-night.png` });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(machine).toHaveCSS('animation-name', 'none');
    await page.getByRole('button', { name: 'Undo last order', exact: true }).click();
    await expect(machine).toHaveCount(0);
  });

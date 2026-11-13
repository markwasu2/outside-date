import { test, expect } from '@playwright/test';
test.use({ storageState: { cookies: [], origins: [] } });
test('world-camera prototype carries a real six-hall expansion through sale', async ({ page }) => {
  test.setTimeout(110000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.addInitScript(() => {
    localStorage.setItem('outside-date-world-campus-preview', 'true');
    localStorage.setItem('outside-date-detailed', 'true');
    Math.random = () => 0.123456789;
  });
  await page.goto('/');
  await page.locator('select').first().selectOption('whale');
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  for (let step = 0; step < 8; step++) await page.getByRole('button', { name: /^Next:/ }).click();
  await page.getByRole('button', { name: 'Review closing table', exact: true }).click();
  await page.getByRole('button', { name: 'Start campaign', exact: true }).click();
  await page.getByRole('button', { name: 'Simple view', exact: true }).click();
  let expanded = false,
    opened = false;
  for (let month = 0; month < 75; month++) {
    if (!(await page.getByTestId('tycoon-game').count())) break;
    const decline = page.getByRole('button', { name: /^Decline the upgrade/ });
    if (await decline.count()) await decline.click();
    const slider = page.getByTestId('event-scale');
    if (await slider.count()) {
      await slider.fill(
        (await page.getByTestId('expansion-cutoff').count())
          ? ((await slider.getAttribute('max')) ?? '2')
          : '0',
      );
      await page.getByTestId('event-choice-commit').click();
    }
    if (await page.getByTestId('simple-sell').count()) {
      await page.getByTestId('simple-sell').click();
      await page.getByTestId('commit-takeout').click();
      break;
    }
    const cure = page.getByRole('button', {
      name: 'Unfreeze building funds · 2 points',
      exact: true,
    });
    if ((await cure.count()) && (await cure.isEnabled())) await cure.click();
    for (const id of ['road', 'substation', 'siteOffice', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']) {
      const b = page.locator(`[data-map-control="${id}"] button`);
      if (!(await b.count()) || !(await b.isEnabled())) continue;
      const label = (await b.innerText()).replace(/^H\d+ · /, '');
      if (
        /Buy land|Build foundation|Build frame|Build walls|Install interiors|Install liquid cooling|Test & open|Repair/.test(
          label,
        )
      ) {
        await b.click();
        continue;
      }
      if (id.startsWith('H')) continue;
      await b.click();
      const p = page.getByTestId('simple-object-panel');
      await expect(p).toBeVisible();
      for (let pass = 0; pass < 8; pass++) {
        const rows = p.getByTestId('simple-do-action');
        let acted = false;
        for (let i = 0; i < (await rows.count()); i++) {
          const row = rows.nth(i),
            name = await row.innerText();
          if (
            (await row.isEnabled()) &&
            /Start power study|Order transformer|Order electrical equipment|Apply for .*permit|Apply for power approval|Prepare power hearing|Answer regulator|Meet /.test(
              name,
            )
          ) {
            await row.click();
            acted = true;
            break;
          }
        }
        if (!acted) break;
      }
      await p.getByRole('button', { name: 'Close', exact: true }).click();
    }
    await expect(page.getByTestId('map-root')).toHaveAttribute('data-world-camera', 'true');
    if (!expanded && (await page.locator('[data-hall-id="H6"]').count())) {
      expanded = true;
      await page.screenshot({ path: '/tmp/world-real-six-expansion.png' });
    }
    if (!opened && (await page.getByTestId('rent-ticker').count()) >= 4) {
      opened = true;
      await page.screenshot({ path: '/tmp/world-real-six-open.png' });
      await page.getByTestId('night-view').click();
      await page.screenshot({ path: '/tmp/world-real-six-night.png' });
      await page.getByTestId('night-view').click();
      const fit = await page.locator('[data-hall-id="H1"]').boundingBox();
      expect(fit).toBeTruthy();
      await expect(page.locator('[data-hall-id=H1] [data-map-control] button')).toContainText(
        'Open for rent',
      );
      await page.getByTestId('world-zoom').click();
      const large = await page.locator('[data-hall-id="H1"]').boundingBox();
      expect(large!.width / fit!.width).toBeCloseTo(1.7, 1);
      await page.getByRole('button', { name: 'Inspect H6', exact: true }).click();
      await expect(page.getByTestId('simple-object-panel')).toBeVisible();
      const panel = await page.getByTestId('simple-object-panel').boundingBox(),
        map = await page.getByTestId('map-root').boundingBox();
      expect(panel!.x).toBeGreaterThanOrEqual(map!.x);
      expect(panel!.x + panel!.width).toBeLessThanOrEqual(map!.x + map!.width);
      await page.screenshot({ path: '/tmp/world-real-six-zoom-panel.png' });
      await page
        .getByTestId('simple-object-panel')
        .getByRole('button', { name: 'Close', exact: true })
        .click();
      await page.getByTestId('world-zoom').click();
      await page.getByTestId('world-camera-scroll').evaluate((e) => {
        e.scrollLeft = 0;
        e.scrollTop = 0;
      });
      for (const size of [
        { width: 1536, height: 960 },
        { width: 1024, height: 768 },
      ]) {
        await page.setViewportSize(size);
        await page.waitForTimeout(150);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await page.screenshot({ path: `/tmp/world-real-six-${size.width}.png` });
      }
      await page.setViewportSize({ width: 1280, height: 720 });
    }
    const prior = await page.getByTestId('simple-month').innerText();
    await page.getByTestId('simple-next-month').click();
    await expect
      .poll(
        async () =>
          !(await page.getByTestId('tycoon-game').count()) ||
          (await page.getByRole('dialog').count()) > 0 ||
          (await page.getByTestId('simple-sell').count()) > 0 ||
          (await page.getByTestId('simple-month').innerText()) !== prior,
      )
      .toBe(true);
  }
  await expect(page.getByTestId('simple-result')).toBeVisible();
  await expect(page.locator('body')).toContainText('6/6 data centers opened');
  expect(expanded).toBe(true);
  expect(opened).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: '/tmp/world-real-six-result.png' });
});

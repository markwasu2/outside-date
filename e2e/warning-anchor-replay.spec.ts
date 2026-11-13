import { test, expect } from '@playwright/test';
test.use({ storageState: { cookies: [], origins: [] } });
for (const width of [1280, 1024])
  test(`warning badge stays over its paused hall through actual storm and sale at ${width}`, async ({
    page,
  }) => {
    test.setTimeout(110000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 720 });
    await page.addInitScript(() => {
      localStorage.setItem('outside-date-detailed', 'true');
      Math.random = () => 0.743287192;
    });
    await page.goto('/');
    await page.locator('select').first().selectOption('tutorial-edge5');
    await page.getByRole('button', { name: 'New game', exact: true }).click();
    for (let step = 0; step < 8; step++) await page.getByRole('button', { name: /^Next:/ }).click();
    await page.getByRole('button', { name: 'Review closing table', exact: true }).click();
    await page.getByRole('button', { name: 'Start campaign', exact: true }).click();
    await page.getByRole('button', { name: 'Simple view', exact: true }).click();
    let paused = false;
    for (let month = 0; month < 35; month++) {
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
      if ((await cure.count()) && (await cure.isEnabled())) {
        paused = true;
        await page.getByTestId('world-zoom').click();
        await page.getByTestId('night-view').click();
        await page.screenshot({ path: `/tmp/warning-anchor-${width}-frozen-${month}.png` });
        expect(await page.getByTestId('world-working-person').count()).toBe(0);
        expect(await page.getByTestId('stage-vehicle').count()).toBe(0);
        expect(await page.getByTestId('hall-work-lights').count()).toBe(0);
        const badge = await page.getByTestId('hall-warning-badges').boundingBox();
        const hall = await page.getByTestId('hall-art-frame').boundingBox();
        expect((badge!.x + badge!.width / 2 - hall!.x) / hall!.width).toBeCloseTo(0.48, 2);
        expect((badge!.y - hall!.y) / hall!.height).toBeCloseTo(0.26, 2);
        await page.getByTestId('night-view').click();
        await page.getByTestId('world-zoom').click();
        await cure.click();
        await page.screenshot({ path: `/tmp/warning-anchor-${width}-cured-${month}.png` });
      }
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

    expect(paused).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `/tmp/warning-anchor-${width}-result.png` });
  });

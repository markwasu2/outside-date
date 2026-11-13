import { test, expect } from '@playwright/test';
test.use({ storageState: { cookies: [], origins: [] } });
for (const width of [1280, 1024])
  test(`real interiors order parks crew truck clear of hall at desktop ${width}`, async ({
    page,
  }) => {
    test.setTimeout(65000);
    await page.setViewportSize({ width, height: 720 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await expect(page.getByTestId('simple-start')).toContainText('Build a data center.');
    await page.screenshot({ path: `/tmp/fitout-order-${width}-title.png` });
    await page.getByTestId('start-first-campus').click();
    await expect(page.getByTestId('tycoon-game')).toBeVisible();
    await expect(page.getByTestId('map-root')).toHaveAttribute('data-world-camera', 'true');
    await expect(page.getByTestId('simple-goal')).toContainText('0/1');
    await expect(page.getByTestId('action-desk')).toHaveCount(0);
    await expect(page.getByTestId('cold-intro')).toHaveCount(0);
    await expect(page.getByTestId('month-review')).toHaveCount(0);
    await page.screenshot({ path: `/tmp/fitout-order-${width}-opening.png` });
    await expect(page.getByTestId('simple-next-month')).toBeInViewport();
    for (let month = 0; month < 35; month++) {
      if (!(await page.getByTestId('tycoon-game').count())) break;
      const slider = page.getByTestId('event-scale');
      if (await slider.count()) {
        await slider.fill('0');
        await page.getByTestId('event-choice-commit').click();
      }
      const cure = page.getByRole('button', {
        name: 'Unfreeze building funds · 2 points',
        exact: true,
      });
      if ((await cure.count()) && (await cure.isEnabled())) await cure.click();
      for (const id of width === 1440
        ? ['road', 'substation', 'siteOffice', 'H1']
        : ['road', 'siteOffice', 'H1', 'substation']) {
        const direct = page.locator(`[data-map-control="${id}"] button`);
        if (!(await direct.count()) || !(await direct.isEnabled())) continue;
        const label = await direct.innerText();
        if (
          /Buy land|Build foundation|Build frame|Build walls|Install interiors|Test & open|Repair/.test(
            label,
          )
        ) {
          await direct.click();
          if (/Install interiors/.test(label)) {
            await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
            const machine = page.getByTestId('stage-vehicle');
            await machine.evaluate(async (el) => (el as HTMLImageElement).decode());
            await page.waitForTimeout(500);
            const hall = await page.getByTestId('hall-art-frame').boundingBox(),
              truck = await machine.boundingBox();
            expect(hall && truck).toBeTruthy();
            // SVG tire-contact points projected back to the hall's world-ground axes.
            // All wheels must be outside the side wall at x=60, not painted onto it.
            for (const [x, y] of [
              [113.7556, 121.7],
              [127.6116, 129.7],
              [165.7156, 151.7],
            ]) {
              const dx =
                ((truck!.x + ((x - 15) * truck!.width) / 300 - hall!.x) * 300) / hall!.width - 145;
              const dy =
                ((truck!.y + ((y + 12) * truck!.width) / 300 - hall!.y) * 300) / hall!.width - 138;
              const groundX = (dx / 0.866 + 2 * dy) / 2;
              expect(groundX).toBeGreaterThan(65);
              expect(groundX).toBeLessThan(145);
            }
            await page.screenshot({ path: `/tmp/fitout-ground-${width}-day.png` });
            await page.getByTestId('night-view').click();
            await page.screenshot({ path: `/tmp/fitout-ground-${width}-night.png` });
            await page.getByTestId('night-view').click();
            await page.getByRole('button', { name: 'Undo last order', exact: true }).click();
            await expect(machine).toHaveCount(0);
            expect(errors).toEqual([]);
            return;
          }
          continue;
        }
        if (id === 'H1') continue;
        await direct.click();
        const panel = page.getByTestId('simple-object-panel');
        await expect(panel).toBeVisible();
        for (let pass = 0; pass < 3; pass++) {
          const buttons = panel.getByTestId('simple-do-action');
          let acted = false;
          for (let i = 0; i < (await buttons.count()); i++) {
            const b = buttons.nth(i),
              name = await b.innerText();
            if (
              /Start power study|Order electrical equipment|Apply for building permit/.test(name) &&
              (await b.isEnabled())
            ) {
              await b.click();
              acted = true;
              break;
            }
          }
          if (!acted) break;
        }
        await panel.getByRole('button', { name: 'Close', exact: true }).click();
      }
      if ([1, 4, 10, 16, 19].includes(month))
        await page.screenshot({ path: `/tmp/fitout-order-${width}-month-${month + 1}.png` });
      await page.getByTestId('simple-next-month').click();
    }
    throw new Error('Actual journey never reached the interiors order');
  });

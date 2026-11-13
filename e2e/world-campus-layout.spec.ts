import { test, expect } from '@playwright/test';
test.use({ storageState: { cookies: [], origins: [] } });
test('shared camera preserves art proportions, crew scale and reachable panels across desktop campuses', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('outside-date-world-campus-preview', 'true'));
  await page.goto('/');
  await page.getByTestId('start-first-campus').click();
  for (const count of [2, 3, 4, 5, 6]) {
    await page.evaluate(async (count) => {
      const { useStore } = await import('/src/ui/store.ts');
      const s = structuredClone(useStore.getState().draft);
      s.flags.siteOptioned = true;
      while (s.halls.length < count)
        s.halls.push({ ...structuredClone(s.halls[0]!), id: `H${s.halls.length + 1}` });
      s.halls = s.halls.slice(0, count);
      s.halls.forEach((h, i) => {
        h.stageIndex = i % 4;
        h.stageActive = true;
        h.stageMonthsDone = 1;
        h.delivered = false;
      });
      useStore.setState({ state: s, draft: s, plan: [] });
    }, count);
    await expect(page.getByTestId('map-root')).toHaveAttribute('data-world-camera', 'true');
    await expect(page.locator('[data-hall-id]')).toHaveCount(count);
    await page.waitForTimeout(100);
    const hall = await page.locator('[data-hall-id="H1"]').boundingBox(),
      crew = await page.getByTestId('campus-people').boundingBox(),
      office = await page.locator('[data-scene-object="office"]').boundingBox();
    expect(hall!.width / hall!.height).toBeCloseTo(300 / 242, 2);
    expect(crew!.width / hall!.width).toBeCloseTo(80 / 300, 2);
    expect(office!.width / hall!.width).toBeCloseTo(160 / 300, 2);
    const machine = await page
      .locator('[data-hall-id="H1"] [data-testid="stage-vehicle-anchor"]')
      .boundingBox();
    expect(machine!.width / hall!.width).toBeCloseTo(0.8, 2);
    // The office doorway must clear a standing person, not just be proportional to a box.
    const officeDoor = (37 * office!.width) / 300,
      person = (63 * crew!.width) / 300;
    expect(officeDoor / person).toBeGreaterThan(1.05);
    expect(officeDoor / person).toBeLessThan(1.6);
    await page.getByRole('button', { name: 'Crew and contacts', exact: true }).click();
    await expect(page.getByTestId('simple-object-panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('simple-object-panel')).toHaveCount(0);
    await page.getByTestId('campus-people').blur();
    await page.screenshot({ path: `/tmp/world-layout-${count}-day.png` });
  }
  for (const [scenario, site, terrain, poles] of [
    ['first-campus', 'edge5-campus', 'campus', 2],
    ['first-campus', 'edge5-meadow', 'meadow', 0],
    ['first-campus', 'edge5-siding', 'depot', 3],
    ['whale', 'quarry-ridge', 'quarry', 4],
  ] as const) {
    await page.evaluate(
      async ({ scenario, site }) => {
        const { useStore } = await import('/src/ui/store.ts');
        const s = structuredClone(useStore.getState().draft);
        s.scenarioId = scenario;
        s.setup.site = site;
        useStore.setState({ state: s, draft: s, plan: [] });
      },
      { scenario, site },
    );
    await expect(page.getByTestId('map-root')).toHaveAttribute('data-terrain', terrain);
    await expect(page.getByTestId('world-power-pole')).toHaveCount(poles);
    await expect(page.getByTestId('map-pond-slot')).toHaveAttribute(
      'data-pond',
      String(terrain === 'meadow'),
    );
    await page.screenshot({ path: `/tmp/world-terrain-${terrain}.png` });
  }
});

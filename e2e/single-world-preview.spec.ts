import { test, expect } from '@playwright/test';
test.use({ storageState: { cookies: [], origins: [] } });
test('single-hall default camera preserves opening, work, courtyard and night states', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('outside-date-single-world-preview', 'true'));
  await page.goto('/');
  await page.getByTestId('start-first-campus').click();
  await expect(page.getByTestId('map-root')).toHaveAttribute('data-world-camera', 'true');
  await page.screenshot({ path: '/tmp/single-world-opening.png' });
  await page.locator('[data-map-control=road] button').click();
  await page.locator('[data-map-control=H1] button').click();
  await page.screenshot({ path: '/tmp/single-world-work.png' });
  await page.evaluate(async () => {
    const { useStore } = await import('/src/ui/store.ts');
    const s = structuredClone(useStore.getState().draft);
    s.halls[0]!.stageIndex = 5;
    s.halls[0]!.delivered = true;
    s.halls[0]!.stageActive = false;
    s.halls[0]!.energized = true;
    s.power.substationStatus = 'done';
    useStore.setState({ state: s, draft: s, plan: [] });
  });
  await page.screenshot({ path: '/tmp/single-world-open.png' });
  await page.getByTestId('night-view').click();
  await page.screenshot({ path: '/tmp/single-world-night.png' });
});

import { expect, test } from '@playwright/test';

test('Millbrook Relay is selectable and starts a single-hall campaign', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Scenario:', { exact: false }).selectOption('millbrook-relay');
  await expect(page.getByText(/Millbrook Relay: one 20 MW hall/)).toBeVisible();
  await page.screenshot({ path: '/tmp/millbrook-relay-title.png', fullPage: true });
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  for (let i=0;i<8;i++) await page.getByRole('button', { name: /^Next:/ }).click();
  await page.getByRole('button',{name:'Review closing table',exact:true}).click();
  await page.getByRole('button', { name: 'Start campaign', exact: true }).click();
  await expect(page.getByRole('button', { name: 'End month', exact: true })).toBeVisible();
  await expect(page.getByText('H1', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('H2', { exact: false })).toHaveCount(0);
  await page.screenshot({ path: '/tmp/millbrook-relay-campus.png', fullPage: true });
});

test('Millbrook Relay careful seed 1 finishes with a priced report card', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof (window as unknown as { __debugRunBot?: unknown }).__debugRunBot === 'function');
  await page.evaluate(() => {
    (window as unknown as {
      __debugRunBot: (bot: string, scenario: string, difficulty: string, seed: number) => void;
    }).__debugRunBot('careful', 'millbrook-relay', 'normal', 1);
  });
  const report = page.getByRole('heading', { name: 'Report card', exact: true });
  for (let i = 0; i < 5 && await report.count() === 0; i += 1) {
    await page.getByRole('button', { name: /^(Skip|Continue)$/ }).click();
  }
  await expect(report).toBeVisible();
  await expect(page.getByText(/Campus value .* equity multiple/)).toBeVisible();
  await expect(page.getByText(/1\.58x/)).toBeVisible(); // Phase 3: 1.61x -> 1.64x (forecast sizing, lever bots); Phase 4: 1.58x; Phase 5: 1.66x (living markets: careful second-sources the hot transformer market); Phase 9: 1.58x (riverbend easement retune: careful's value policy now picks the cured-permit farm)
  await page.screenshot({ path: '/tmp/millbrook-relay-report.png', fullPage: true });
});

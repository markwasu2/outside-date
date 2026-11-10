import { adviceElement } from './campusNavigation';
import { test, expect } from '@playwright/test';
import fs from 'node:fs';

/** Full-run regression: follows the Next card like a
 * first-time player, resolves event sliders deliberately, logs every beat, screenshots key
 * moments. Trace goes to /tmp/coldrun-trace.txt, shots to /tmp/coldrun/. */
test('cold full tutorial run via the Next card', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const trace: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  fs.mkdirSync('/tmp/coldrun', { recursive: true });
  const shot = async (name: string) => { await page.screenshot({ path: `/tmp/coldrun/${name}.png` }); };

  await page.goto('/');
  await page.getByRole('button', { name: 'Tutorial', exact: true }).click();
  await page.waitForTimeout(400);
  trace.push('START ' + (await page.getByTestId('campus-status').innerText()).replaceAll('\n', ' '));
  await expect(page.getByTestId('tutorial-deadlines')).toContainText('lease target');
  await shot('01-fresh-start');

  for (let turn = 0; turn < 60; turn++) {
    const end = page.getByRole('heading', { name: /Rating the campus|Report card|You lose|You win|You scraped by/ });
    if (await end.count()) break;

    // Event slider modal: read the stakes, pick a level deliberately.
    const eventDialog = page.getByRole('dialog');
    if (await page.getByTestId('event-choice-commit').count()) {
      trace.push('EVENT ' + (await eventDialog.innerText()).replaceAll('\n', ' '));
      const slider = page.getByTestId('event-scale');
      const max = Number(await slider.getAttribute('max'));
      await slider.fill(String(Math.floor(max / 2)));
      await shot(`event-${trace.length}`);
      await page.getByTestId('event-choice-commit').click();
      continue;
    }

    const status = (await page.getByTestId('campus-status').innerText()).replaceAll('\n', ' ');
    const card = await (await adviceElement(page, 'next-step-card')).innerText().catch(() => '(no card)');
    trace.push(`MONTH ${status} | NEXT ${card.replaceAll('\n', ' / ')}`);

    const notice = page.getByTestId('event-notice-dismiss');
    while (await notice.count()) { trace.push('NOTICE dismissed'); await notice.first().click(); await page.waitForTimeout(150); }

    // Takeout finish.
    if (await page.getByTestId('price-takeout-banner').count()) {
      trace.push('PRICE TAKEOUT');
      await page.getByTestId('price-takeout-banner').click();
      await expect(page.getByTestId('close-time-explanation')).toContainText('outside date');
      await shot('takeout-preview');
      trace.push('TAKEOUT PREVIEW ' + (await page.getByTestId('takeout-preview-card').innerText()).replaceAll('\n', ' '));
      await page.getByTestId('commit-takeout').click();
      break;
    }

    const prep = (await adviceElement(page, 'wait-prep-action'));
    if (await prep.count()) {
      trace.push('PREP ' + await prep.innerText()); await prep.click();
      await expect(prep).toHaveCount(0); continue;
    }
    // Follow the Next card's own do-it-now when offered; else end the month.
    const doit = (await adviceElement(page, 'next-step-do-it'));
    if (await doit.count()) {
      trace.push('DO ' + (await (await adviceElement(page, 'next-step-card')).innerText()).split('\n')[0]);
      await doit.click();
      await page.waitForTimeout(150);
      continue; // re-read the new card before ending the month
    }
    if (turn % 4 === 0) await shot(`month-${turn}`);
    const skip = page.getByTestId('skip-quiet-months');
    if (await skip.count()) {
      trace.push('SKIP quiet months'); await skip.click();
      const after = await (await adviceElement(page, 'next-step-card')).innerText();
      trace.push('AFTER SKIP ' + after.replaceAll('\n', ' / '));
    } else await page.getByRole('button', { name: 'End month', exact: true }).click();
    await page.waitForTimeout(200);
  }

  for (let i = 0; i < 8; i++) {
    const next = page.getByRole('button', { name: /^(Skip|Continue)$/ });
    if (!(await next.count())) break;
    await next.first().click();
    await page.waitForTimeout(150);
  }
  await expect(page.getByRole('heading', { name: 'Report card', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  expect(trace.some(t => t.startsWith('PREP '))).toBe(true);
  expect(trace).toContain('AFTER SKIP Advice: Option the site / Show me / Do it now / ▼');
  expect(trace.some(t => t.startsWith('SKIP '))).toBe(true);
  await shot('99-report');
  trace.push('END ' + (await page.locator('body').innerText()).replaceAll('\n', ' ').slice(0, 1200));
  if (errors.length) trace.push('PAGE ERRORS ' + errors.join(' | '));
  fs.writeFileSync('/tmp/coldrun-trace.txt', trace.join('\n'));
});

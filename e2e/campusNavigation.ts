import type { Page } from '@playwright/test';

/** Explicit navigation through the on-demand desktop panels. */
export async function openActions(page: Page) {
  if (!(await page.getByTestId('actions-drawer').isVisible())) await page.getByRole('button', { name: 'Plan', exact: true }).click();
  if (!(await page.getByTestId('action-search').isVisible())) await page.getByRole('button', { name: 'Find an action', exact: true }).click();
}
export async function filterActions(page: Page, system: string) {
  await openActions(page); await page.getByTestId('action-search').fill(system.toLowerCase());
}
export async function openStatus(page: Page) {
  if (!(await page.getByTestId('status-drawer').isVisible())) await page.getByRole('button', { name: /Status & guide/ }).click();
}
export async function closePanel(page: Page) {
  const close = page.getByRole('button', { name: 'Close panel', exact: true });
  if (await close.isVisible()) await close.click();
}

/** Old recommendation tests opt in explicitly; the monthly review is the default surface. */
export async function adviceElement(page: Page, testId: string) {
  const toggle = page.getByRole('button', { name: 'Show advice', exact: true });
  if (await toggle.count()) await toggle.click();
  const review=page.getByRole('button',{name:'Month review',exact:true});
  if(await page.getByTestId('month-review').count() && await review.count())await review.click();
  return page.getByTestId(testId);
}

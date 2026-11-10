import type { Page } from '@playwright/test';

/** Explicit navigation through the on-demand desktop panels. */
export async function openActions(page: Page) {
  if (!(await page.getByTestId('actions-drawer').isVisible())) await page.getByRole('button', { name: 'All actions', exact: true }).click();
}
export async function openStatus(page: Page) {
  if (!(await page.getByTestId('status-drawer').isVisible())) await page.getByRole('button', { name: /Status & guide/ }).click();
}
export async function closePanel(page: Page) {
  const close = page.getByRole('button', { name: 'Close panel', exact: true });
  if (await close.isVisible()) await close.click();
}

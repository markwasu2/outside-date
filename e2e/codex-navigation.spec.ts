import { test, expect } from '@playwright/test';

test('focused stakeholder help keeps its close and return controls above the reading area', async ({page}) => {
  await page.goto('/');
  await page.getByRole('button', {name: 'Codex', exact: true}).click();
  await page.evaluate(async () => {
    // @ts-expect-error dev browser import
    const {useStore} = await import('/src/ui/store.ts');
    useStore.getState().openCodex('stakeholders', 'town');
  });
  const dialog = page.getByRole('dialog', {name: 'Codex'});
  const reader = dialog.getByTestId('codex-reading-area');
  await expect(dialog.getByTestId('stakeholder-card-town')).toBeInViewport();
  await reader.evaluate(el => el.scrollTo(0, el.scrollHeight));
  const close = dialog.getByRole('button', {name: 'Close', exact: true});
  const back = dialog.getByRole('button', {name: 'Back to list', exact: true});
  const rb = (await reader.boundingBox())!;
  for (const control of [close, back]) {
    const box = (await control.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(rb.y);
  }
  await page.screenshot({path: 'docs/screenshots/cold2/codex-navigation.png'});
  await back.click();
  await expect(dialog.getByPlaceholder('Search the codex...')).toBeVisible();
  await close.click();
  await expect(dialog).toHaveCount(0);
});

test('Codex navigation fits narrow desktop windows and Escape returns to the game', async ({page}) => {
  await page.setViewportSize({width: 600, height: 540});
  await page.goto('/'); await page.getByTestId('quick-start').click();
  await page.evaluate(async () => {
    // @ts-expect-error dev browser import
    const {useStore} = await import('/src/ui/store.ts');
    useStore.getState().openCodex('stakeholders', 'town');
  });
  const dialog = page.getByRole('dialog', {name: 'Codex'});
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(600);
  expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(540);
  await expect(dialog.getByRole('button', {name: 'Close', exact: true})).toBeVisible();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'End month', exact: true})).toBeVisible();
});


test('event help returns to the unresolved choice without deciding it', async ({page}) => {
  await page.goto('/'); await page.getByTestId('quick-start').click();
  await page.evaluate(async () => {
    // @ts-expect-error dev browser import
    const {useStore} = await import('/src/ui/store.ts');
    const s = useStore.getState(); const card = s.content.events.find((c: {id: string}) => c.id === 'governor_visit');
    const state = {...s.state, phase: 'awaitingChoice', pending: {cardId: card.id, choices: card.choices}};
    useStore.setState({state, draft: state});
  });
  const event = page.getByTestId('campus-event-card');
  await event.getByTestId('who-holds-chip').click();
  const dialog = page.getByRole('dialog', {name: 'Codex'});
  await expect(dialog.getByTestId('stakeholder-card-town')).toBeInViewport();
  await dialog.getByRole('button', {name: 'Close', exact: true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(event).toBeVisible();
  await event.getByTestId('event-choice-commit').click();
  await expect(event).toHaveCount(0);
});

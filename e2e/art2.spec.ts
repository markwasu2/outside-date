import { expect, test } from '@playwright/test';

test('illustrated access road keeps its label and transmission clues visible', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('quick-start').click();
  const road = page.getByTestId('map-road');
  await expect(page.getByTestId('map-root')).toHaveAttribute('data-campus-scene', 'true');
  await expect(road.locator('img')).toBeHidden(); // Access road is now part of the shared ground illustration.
  await expect(road).toContainText('Road');
  await page.screenshot({ path: 'docs/screenshots/cold2/art-road.png' });
});

test('dry sites show dry illustrated land while retaining the labelled water route', async ({ page }) => {
  await page.goto('/'); await page.getByTestId('quick-start').click();
  const field = page.getByTestId('map-pond-slot');
  await expect(field).toHaveAttribute('data-pond', 'false');
  await expect(field.locator('img')).toBeVisible();
  await expect(field).toContainText('Water permit');
  await page.screenshot({ path: 'docs/screenshots/cold2/art-dry-field.png' });
});

test('setup site previews use the same illustrated board assets and keep theme clues', async ({ page }) => {
  await page.goto('/'); await page.locator('select').first().selectOption('whale');
  await page.getByRole('button', { name: 'New game' }).click();
  await expect(page.getByTestId('site-art-preview')).toHaveCount(3);
  await expect(page.getByTestId('site-card-megasite').locator('img')).toHaveCount(4);
  await expect(page.getByTestId('site-card-farmland').getByTestId('site-preview-pond')).toHaveAttribute('data-pond','true');
  await page.screenshot({ path: 'docs/screenshots/cold2/art-setup.png', fullPage: true });
});

test('substation illustration follows physical build state, not just a completed study', async ({ page }) => {
  await page.goto('/'); await page.getByTestId('quick-start').click();
  const sub = page.getByTestId('map-substation');
  await expect(sub).toHaveAttribute('data-build-state','none');
  const planned = await sub.locator('img').getAttribute('src');
  await page.evaluate(async () => {
    const { useStore } = await import('/src/ui/store.ts'); const s = useStore.getState();
    const next = structuredClone(s.state); next.power.studyStatus = 'done';
    next.power.substationStatus = 'building'; next.power.substationDoneMonth = next.month + 2;
    useStore.setState({state:next,draft:next});
  });
  await expect(sub).toHaveAttribute('data-build-state','building');
  expect(await sub.locator('img').getAttribute('src')).not.toBe(planned);
  await expect(sub).toContainText('Done Y1 M3');
  await page.screenshot({ path: 'docs/screenshots/cold2/art-substation.png' });
  await page.evaluate(async () => {
    const { useStore } = await import('/src/ui/store.ts'); const s = useStore.getState();
    const next = structuredClone(s.state); next.power.substationStatus = 'done';
    useStore.setState({state:next,draft:next});
  });
  await expect(sub).toHaveAttribute('data-build-state','done');
  await expect(sub.getByRole('progressbar')).toHaveCount(0);
});

test('power plants show waiting, working and online buildouts with real dates and MW', async ({ page }) => {
  await page.goto('/'); await page.getByTestId('quick-start').click();
  await expect(page.getByTestId('plant-buildout-A')).toHaveAttribute('data-build-state','waiting');
  await page.evaluate(async () => {
    const { useStore } = await import('/src/ui/store.ts'); const s = useStore.getState();
    const next = structuredClone(s.state);
    next.power.plants[0].plannedOnlineMonth = next.month + 3;
    next.power.plants[1].plannedOnlineMonth = next.month; next.power.plants[1].onlineMonth = next.month;
    useStore.setState({state:next,draft:next});
  });
  await expect(page.getByTestId('plant-buildout-A')).toHaveAttribute('data-build-state','building');
  await expect(page.getByTestId('plant-buildout-B')).toHaveAttribute('data-build-state','online');
  await expect(page.getByTestId('plant-buildout-B')).toContainText('MW');
  await page.screenshot({ path: 'docs/screenshots/cold2/art-plants.png' });
});

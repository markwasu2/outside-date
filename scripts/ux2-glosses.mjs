/* global console, localStorage */
// UX 2 first-use gloss screenshots. Run with the dev server up on :5173.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const OUT = 'docs/screenshots/ux2';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE);
await page.locator('select').first().selectOption('whale');
await page.getByRole('button', { name: 'New game' }).click();
// Site selection: pad-months gloss on the site card.
await page.getByTestId('gloss-pad-months').first().waitFor();
await page.screenshot({ path: `${OUT}/setup-sites-1440.png` });
console.log('site card:', await page.getByTestId('gloss-pad-months').first().innerText());
// Lease: outside-date gloss.
await page.getByRole('button', { name: 'Next: Lease' }).click();
await page.getByTestId('gloss-outside-date').waitFor();
console.log('lease:', await page.getByTestId('gloss-outside-date').innerText());
// Capital: LTC + PIK + DSCR glosses.
await page.getByRole('button', { name: 'Next: Forecast' }).click();
await page.getByRole('button', { name: 'Next: Capital stack' }).click();
await page.getByTestId('gloss-ltc').waitFor();
await page.screenshot({ path: `${OUT}/capital-1440.png` });
console.log('ltc:', await page.getByTestId('gloss-ltc').innerText());
console.log('pik:', await page.getByTestId('gloss-pik').innerText());
console.log('dscr:', await page.getByTestId('gloss-dscr').innerText());
// Power: docket gloss.
await page.getByRole('button', { name: 'Next: Power' }).click();
await page.getByTestId('gloss-docket').waitFor();
console.log('docket:', await page.getByTestId('gloss-docket').innerText());
await page.screenshot({ path: `${OUT}/power-1440.png` });
await browser.close();

// plays the same-screen games in a phone-sized browser, light and dark,
// checks what the screen says, and saves screenshots along the way.
// usage: pnpm play [url]   (default http://localhost:5173, needs `pnpm dev` running)
// output: .shots/play-*.png. exits non-zero on a failed check or a page error.

import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:5173';
const errors = [];

async function launch() {
  for (const channel of ['chrome', 'msedge']) {
    try {
      return await chromium.launch({ channel });
    } catch {
      // try the next one
    }
  }
  return chromium.launch();
}

await mkdir('.shots', { recursive: true });
const browser = await launch();
const wait = (ms) => new Promise((resolve) => globalThis.setTimeout(resolve, ms));

try {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await context.addInitScript(`localStorage.setItem('lull:theme', '${theme}')`);
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(`${theme}: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && errors.push(`${theme}: ${m.text()}`));
    const shot = (name) => page.screenshot({ path: `.shots/play-${name}-${theme}.png` });
    const status = page.locator('[aria-live="polite"]');

    /* tic tac toe -------------------------------------------------------- */
    await page.goto(base, { waitUntil: 'networkidle' });
    // cards open rooms by default. same screen keeps these three on this device.
    await page.getByRole('button', { name: 'same screen', pressed: false }).click();
    await page.getByRole('button', { name: 'open tic tac toe' }).click();
    await page.waitForURL('**/play/tictactoe');
    const cell = (r, c) =>
      page.getByRole('button', { name: new RegExp(`^row ${r}, column ${c},`) });
    await expect(status).toHaveText("x's turn");
    await cell(1, 1).click();
    await cell(2, 1).click();
    await cell(1, 2).click();
    await cell(2, 2).click();
    await cell(1, 2).click({ force: true }); // taken: a quiet nudge, nothing else
    await expect(status).toHaveText("x's turn");
    await wait(400);
    await shot('ttt-mid');
    await cell(1, 3).click();
    await expect(status).toHaveText('x wins. good game.');
    await wait(1300);
    await shot('ttt-win');
    await page.getByRole('button', { name: 'undo' }).click();
    await expect(status).toHaveText("x's turn");
    await page.getByRole('button', { name: 'again?' }).waitFor({ state: 'detached' });

    // keyboard: arrows move, enter plays
    await page.getByRole('button', { name: 'start again' }).click();
    await cell(1, 1).focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(cell(2, 2)).toHaveAccessibleName('row 2, column 2, x');
    await page.getByRole('button', { name: '5×5' }).click();
    await expect(page.getByRole('button', { name: /^row 5, column 5,/ })).toBeVisible();
    await wait(600);
    await shot('ttt-five');

    /* squares ------------------------------------------------------------- */
    await page.getByRole('button', { name: 'home' }).click();
    await page.getByRole('button', { name: 'open squares' }).click();
    await page.waitForURL('**/play/dots');
    const edge = (where) => page.getByRole('button', { name: new RegExp(`^line, ${where},`) });
    await edge('row 1, dots 1 to 2').click();
    await edge('row 2, dots 1 to 2').click();
    await edge('column 1, dots 1 to 2').click();
    await edge('row 1, dots 1 to 2').click({ force: true }); // taken
    await expect(status).toHaveText("b's turn");
    await wait(500);
    await shot('dots-three-sides');
    await edge('column 2, dots 1 to 2').click();
    await expect(status).toHaveText('b goes again');
    await wait(900);
    await shot('dots-box');
    await page.getByRole('button', { name: '4', exact: true }).click();
    await expect(page.getByRole('list', { name: 'players' }).getByRole('listitem')).toHaveCount(4);
    await wait(500);
    await shot('dots-four');

    /* nine men's morris ----------------------------------------------------- */
    await page.getByRole('button', { name: 'home' }).click();
    await page.getByRole('button', { name: "open nine men's morris" }).click();
    await page.waitForURL('**/play/morris');
    const point = (spot) => page.getByRole('button', { name: new RegExp(`^${spot},`) });
    await expect(status).toHaveText('a, place a piece');
    for (const spot of ['a7', 'a4', 'd7', 'b6', 'g7']) await point(spot).click();
    await expect(status).toHaveText('a, remove one');
    await wait(900);
    await shot('morris-mill');
    await point('d7').click(); // own piece: not removable
    await expect(status).toHaveText('a, remove one');
    await point('a4').click();
    await expect(status).toHaveText('b, place a piece');
    await wait(500);
    await shot('morris-removed');

    /* sim ------------------------------------------------------------------- */
    await page.getByRole('button', { name: 'home' }).click();
    await page.getByRole('button', { name: 'open sim' }).click();
    await page.waitForURL('**/play/sim');
    await expect(status).toHaveText("a's turn");
    const line = (p, q) => page.getByRole('button', { name: `line from ${p} to ${q}, open` });
    const dot = (p) => page.getByRole('button', { name: `dot ${p}`, exact: true });
    await line(1, 2).click();
    await expect(status).toHaveText("b's turn");
    // a drawn line can't be drawn again
    await page
      .getByRole('button', { name: 'line from 1 to 2, first player' })
      .click({ force: true });
    await expect(status).toHaveText("b's turn");
    // dot then dot works too, and undo takes it back
    await dot(4).click();
    await dot(5).click();
    await expect(status).toHaveText("a's turn");
    await page.getByRole('button', { name: 'undo' }).click();
    await expect(status).toHaveText("b's turn");
    await dot(4).click();
    await dot(5).click();
    // the two upright sides have a box with no width, which the browser check can't click.
    // players can; the check uses the dots for those.
    await dot(2).click();
    await dot(3).click();
    await dot(5).click();
    await dot(6).click();
    await expect(status).toHaveText("a's turn");
    await wait(400);
    await shot('sim-playing');
    await dot(1).click();
    await dot(3).click();
    await expect(status).toHaveText('b wins. a made a triangle.');
    await wait(1100);
    await shot('sim-end');

    await context.close();
  }
} catch (e) {
  errors.push(e instanceof Error ? e.message : String(e));
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('played tic tac toe, squares, morris and sim in both themes. all good.');

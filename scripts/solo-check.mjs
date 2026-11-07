// plays the games you can do on your own: sudoku, zip and hangman. each one
// opens from its home card with no room, is played to the end, and starts
// again. it also checks the way out to a room with friends. desktop size,
// light and dark. fails on any page error. saves .shots/solo-*.png.
// usage: pnpm play:solo [url]   (needs `pnpm dev`)

import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import {
  solveFutoshiki,
  solveSudoku,
  solveWordSearch,
  solveZip,
  swipeWheel,
  wheelPath,
  wheelWordsFor,
} from './solvers.mjs';

const base = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://localhost:5173';
const errors = [];
const wait = (ms) => new Promise((r) => globalThis.setTimeout(r, ms));

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

/** the digits a sudoku cell could take, given the grid */
function candidatesOf(grid, c) {
  const r = Math.floor(c / 9);
  const k = c % 9;
  const used = new Set();
  for (let i = 0; i < 9; i++) {
    used.add(grid[r * 9 + i]);
    used.add(grid[i * 9 + k]);
    used.add(
      grid[(Math.floor(r / 3) * 3 + Math.floor(i / 3)) * 9 + Math.floor(k / 3) * 3 + (i % 3)],
    );
  }
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !used.has(d));
}

/** the numbers on a board, read from each cell's label the way a screen reader hears them */
async function readCells(page, pattern) {
  const labels = await page
    .getByRole('gridcell')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''));
  return labels.map((l) => {
    const m = pattern.exec(l);
    return m ? Number(m[1]) : 0;
  });
}

await mkdir('.shots', { recursive: true });
const browser = await launch();

try {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    await context.addInitScript(`localStorage.setItem('lull:theme', '${theme}')`);
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(`${theme}: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && errors.push(`${theme}: ${m.text()}`));
    let sockets = 0;
    // only the room server's socket counts. vite's dev reload socket is always there.
    page.on('websocket', (ws) => {
      if (ws.url().includes('/api/ws')) sockets++;
    });
    const shot = (name) => page.screenshot({ path: `.shots/solo-${name}-${theme}.png` });
    const status = page.locator('[aria-live="polite"]').first();

    /* back, from a page opened straight from a link: there's nothing behind it, so home */
    await page.goto(`${base}/play/zip`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'back', exact: true }).click();
    await page.waitForURL((u) => new URL(u).pathname === '/');

    /* the dock's own start a room, with no game in mind yet, still asks which */
    await page.getByRole('button', { name: 'start a room' }).first().click();
    await page.waitForURL('**/new');
    await expect(page.getByRole('group', { name: 'game' })).toBeVisible();
    await page.getByRole('button', { name: 'back', exact: true }).click();
    await page.waitForURL((u) => new URL(u).pathname === '/');

    /* home's small sheets ---------------------------------------------------- */
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'how it works' }).click();
    await expect(page.getByRole('dialog', { name: 'how it works' })).toBeVisible();
    await wait(400);
    await shot('home-how-it-works');
    await page.getByRole('button', { name: 'got it' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'changelog' }).click();
    await expect(page.getByRole('dialog', { name: 'changelog' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    /* sudoku ---------------------------------------------------------------- */
    await page.getByRole('button', { name: 'open sudoku' }).click();
    await page.waitForURL('**/play/sudoku');
    await expect(page.getByText('on your own', { exact: true })).toBeVisible();
    await expect(page.getByRole('gridcell')).toHaveCount(81);
    // how to play, from the small ? at the top
    await page.getByRole('button', { name: 'how to play' }).click();
    await expect(page.getByRole('dialog', { name: 'how to play' })).toContainText('1 to 9');
    await wait(400);
    await shot('sudoku-rules');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const puzzle = await readCells(page, /, (\d), given$/);
    const solution = solveSudoku(puzzle);
    const empty = puzzle.flatMap((d, i) => (d === 0 ? [i] : []));
    // a wrong digit, then undo takes it back
    await page.locator(`[data-cell="${empty[0]}"]`).click();
    await page.keyboard.press(String((solution[empty[0]] % 9) + 1));
    await page.getByRole('button', { name: 'undo' }).click();
    await expect(page.locator(`[data-cell="${empty[0]}"]`)).toHaveAccessibleName(/, empty$/);
    // ctrl+z works the same way
    await page.locator(`[data-cell="${empty[0]}"]`).click();
    await page.keyboard.press('7');
    await page.keyboard.press('Control+z');
    await expect(page.locator(`[data-cell="${empty[0]}"]`)).toHaveAccessibleName(/, empty$/);
    // notes: n switches them on, digits jot, n switches them off. a cell with a choice.
    const noted = empty.find((c) => candidatesOf(puzzle, c).length >= 2);
    const jot = candidatesOf(puzzle, noted).slice(0, 2);
    await page.locator(`[data-cell="${noted}"]`).click();
    await page.keyboard.press('n');
    await expect(page.getByRole('button', { name: 'notes', pressed: true })).toBeVisible();
    for (const d of jot) await page.keyboard.press(String(d));
    await expect(page.locator(`[data-cell="${noted}"]`)).toHaveAccessibleName(
      new RegExp(`, notes ${jot.join(' ')}$`),
    );
    await page.keyboard.press('n');
    await expect(page.getByRole('button', { name: 'notes', pressed: false })).toBeVisible();
    await shot('sudoku-notes');
    // a hint fills the chosen cell with the right digit
    await page.getByRole('button', { name: 'hint' }).click();
    await expect(page.locator(`[data-cell="${noted}"]`)).toHaveAccessibleName(
      new RegExp(`, ${solution[noted]}$`),
    );
    for (const [n, cell] of empty.entries()) {
      await page.locator(`[data-cell="${cell}"]`).click();
      await page.keyboard.press(String(solution[cell]));
      if (n === 12) await shot('sudoku-playing');
    }
    await expect(status).toHaveText('solved.. solved with 1 hint.');
    await wait(1100);
    await shot('sudoku-solved');
    await page.getByRole('button', { name: 'another one?' }).click();
    await expect(status).toHaveText('fill every row, column and box with 1 to 9.');
    await expect(page.getByRole('gridcell', { name: /, empty$/ }).first()).toBeVisible();
    const next = await readCells(page, /, (\d), given$/);
    if (JSON.stringify(next) === JSON.stringify(puzzle))
      errors.push('sudoku: the same puzzle twice');
    // the shuffle, mid-puzzle, gives a different one again
    await page.locator(`[data-cell="${next.indexOf(0)}"]`).click();
    await page.keyboard.press('5');
    await expect(page.getByRole('gridcell', { name: /, \d$/ })).toHaveCount(1);
    await page.getByRole('button', { name: 'new puzzle' }).click();
    await expect
      .poll(async () => JSON.stringify(await readCells(page, /, (\d), given$/)))
      .not.toBe(JSON.stringify(next));
    // and nothing you typed comes along to the new one
    await expect(page.getByRole('gridcell', { name: /, \d$/ })).toHaveCount(0);
    // the way to friends
    await page.getByRole('button', { name: 'race friends' }).click();
    await page.waitForURL('**/new?game=sudoku');
    // the game is already chosen: just a name and one pill, no list of other games
    await expect(page.getByRole('heading', { name: 'sudoku' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'game' })).toHaveCount(0);
    await shot('sudoku-new-room');
    // back returns to the puzzle, and back again to home
    await page.getByRole('button', { name: 'back', exact: true }).click();
    await page.waitForURL('**/play/sudoku');
    await page.getByRole('button', { name: 'back', exact: true }).click();
    await page.waitForURL((u) => new URL(u).pathname === '/');
    await expect(page.getByRole('button', { name: 'open sudoku' })).toBeVisible();

    /* zip --------------------------------------------------------------------- */
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'open zip' }).click();
    await page.waitForURL('**/play/zip');
    for (const size of [6, 7]) {
      if (size === 7) {
        await page
          .getByRole('group', { name: 'board' })
          .getByRole('button', { name: '7×7' })
          .click();
      }
      // the screen loads on demand, so wait for the whole grid before reading it
      await expect(page.getByRole('gridcell')).toHaveCount(size * size);
      const onLine = page.getByRole('gridcell', { name: /on your line$/ });
      if (size === 6) {
        // the shuffle gives a different grid
        const before = JSON.stringify(await readCells(page, /, number (\d+)/));
        await page.getByRole('button', { name: 'new puzzle' }).click();
        await expect
          .poll(async () => JSON.stringify(await readCells(page, /, number (\d+)/)))
          .not.toBe(before);
        // each hint grows the line by one cell, from 1
        for (let i = 1; i <= 3; i++) {
          await page.getByRole('button', { name: 'hint' }).click();
          await expect(onLine).toHaveCount(i);
        }
        await expect(page.getByRole('gridcell', { name: /number 1, on your line$/ })).toHaveCount(
          1,
        );
        await page.getByRole('button', { name: 'start over' }).click();
        await expect(onLine).toHaveCount(0);
      }
      const numbers = await readCells(page, /, number (\d+)/);
      if (numbers.length !== size * size) throw new Error(`zip: expected ${size * size} cells`);
      const path = solveZip(size, numbers, Math.max(...numbers));
      if (path.length !== size * size) throw new Error('zip: no solution found by the check');
      // drag the first stretch, tap the rest
      const box = async (c) => page.locator(`[data-cell="${c}"]`).boundingBox();
      const first = await box(path[0]);
      await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
      await page.mouse.down();
      for (const c of path.slice(1, 10)) {
        const b = await box(c);
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 });
      }
      await page.mouse.up();
      await expect(onLine).toHaveCount(10);
      if (size === 6) {
        await shot('zip-playing');
        // backspace takes one step back, and so does the undo pill
        await page.locator(`[data-cell="${path[9]}"]`).focus();
        await page.keyboard.press('Backspace');
        await expect(onLine).toHaveCount(9);
        await page.getByRole('button', { name: 'undo', exact: true }).first().click();
        await expect(onLine).toHaveCount(8);
      }
      for (const c of path.slice(size === 6 ? 8 : 10)) {
        await page.locator(`[data-cell="${c}"]`).click();
      }
      // the three hints at 6×6 count for that grid, even after starting over
      await expect(status).toHaveText(
        size === 6 ? 'solved.. solved with 3 hints.' : 'solved.. nicely done.',
      );
      if (size === 6) {
        await wait(1100);
        await shot('zip-solved');
        await page.getByRole('button', { name: 'another one?' }).click();
        await expect(status).toHaveText(/^start on 1/);
      }
    }

    /* hangman ------------------------------------------------------------------ */
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'open hangman' }).click();
    await page.waitForURL('**/play/hangman');
    await expect(status).toHaveText('guess the word. tap or type a letter.');
    // a hint shows a letter for a miss
    await page.getByRole('button', { name: 'hint, costs a miss' }).click();
    await expect(page.getByRole('img', { name: '1 of 6 misses' })).toBeVisible();
    await expect(page.getByRole('button', { name: /, in the word$/ })).not.toHaveCount(0);
    let n = 0;
    for (const l of 'etaoinshrdlucmfwypvbgkqjxz') {
      // the screen-reader line changes at once; the visible one fades out first
      if ((await status.textContent()) !== 'guess the word. tap or type a letter.') break;
      // the hint already used this one
      if (!(await page.getByRole('button', { name: l, exact: true }).count())) continue;
      // half by tapping, half by typing
      if (n++ % 2) await page.keyboard.press(l);
      else await page.getByRole('button', { name: l, exact: true }).click();
      await expect(
        page.getByRole('button', { name: new RegExp(`^${l}, (in|not in) the word$`) }),
      ).toBeVisible();
      if (n === 4) await shot('hangman-playing');
    }
    await expect(status).toHaveText(/^(you got it|out of guesses)\.\. the word was [a-z]+$/);
    await wait(1100);
    await shot('hangman-end');
    await page.getByRole('button', { name: 'another word?' }).click();
    await expect(status).toHaveText('guess the word. tap or type a letter.');
    // the shuffle, mid-word: a fresh word with every letter open again
    await page.getByRole('button', { name: 'e', exact: true }).click();
    await expect(page.getByRole('button', { name: /^e, (in|not in) the word$/ })).toBeVisible();
    await page.getByRole('button', { name: 'new word' }).click();
    await expect(page.getByRole('button', { name: 'e', exact: true })).toBeVisible();
    await expect(status).toHaveText('guess the word. tap or type a letter.');
    await page.getByRole('button', { name: 'play with friends' }).click();
    await page.waitForURL('**/new?game=hangman');

    /* word search -------------------------------------------------------------- */
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'open word search' }).click();
    await page.waitForURL('**/play/wordsearch');
    await expect(page.getByRole('gridcell')).toHaveCount(100);
    const letters = await page
      .getByRole('gridcell')
      .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label').split(', ')[2]));
    const words = await page
      .getByRole('list', { name: 'words to find' })
      .getByRole('listitem')
      .evaluateAll((els) => els.map((el) => el.textContent.trim()));
    if (words.length !== 8) throw new Error(`word search: ${words.length} words on 10×10`);
    const spots = solveWordSearch(10, letters, words);
    // a hint rings the first letter of a word still to find
    await page.getByRole('button', { name: 'hint' }).click();
    await expect(page.getByRole('gridcell', { name: /a word starts here$/ })).toHaveCount(1);
    const centerOf = async (c) => {
      const b = await page.locator(`[data-cell="${c}"]`).boundingBox();
      return [b.x + b.width / 2, b.y + b.height / 2];
    };
    for (const [i, w] of words.entries()) {
      if (!spots[w]) throw new Error(`word search: couldn't find ${w} in the grid`);
      const [from, to] = spots[w];
      if (i % 2 === 0) {
        // dragged, last letter first on every other one, since a word can be marked either way
        const [a, z] = i % 4 === 0 ? [from, to] : [to, from];
        await page.mouse.move(...(await centerOf(a)));
        await page.mouse.down();
        await page.mouse.move(...(await centerOf(z)), { steps: 8 });
        await page.mouse.up();
      } else {
        // or clicked: first letter, then last
        await page.locator(`[data-cell="${from}"]`).click();
        await expect(page.getByRole('gridcell', { name: /, picked/ })).toHaveCount(1);
        await page.locator(`[data-cell="${to}"]`).click();
      }
      await expect(page.getByRole('listitem', { name: `${w}, found` })).toBeVisible();
      if (i === 2) {
        await wait(300);
        await shot('wordsearch-playing');
      }
    }
    await expect(status).toHaveText('solved.. solved with 1 hint.');
    await wait(1100);
    await shot('wordsearch-solved');
    await page.getByRole('button', { name: 'race friends' }).click();
    await page.waitForURL('**/new?game=wordsearch');

    /* futoshiki ---------------------------------------------------------------- */
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'open futoshiki' }).click();
    await page.waitForURL('**/play/futoshiki');
    await expect(page.getByRole('gridcell')).toHaveCount(25);
    const labels = await page
      .getByRole('gridcell')
      .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
    const fp = labels.map((l) => (l.split(', ')[2] === 'empty' ? 0 : Number(l.split(', ')[2])));
    const sign = (l, where) =>
      l.includes(`smaller than ${where}`) ? '<' : l.includes(`bigger than ${where}`) ? '>' : null;
    const right = labels.map((l) => sign(l, 'right'));
    const below = labels.map((l) => sign(l, 'below'));
    if (!right.concat(below).some(Boolean)) throw new Error('futoshiki: no signs on the board');
    const fsol = solveFutoshiki(5, fp, right, below);
    if (fsol.includes(0)) throw new Error("futoshiki: the check couldn't solve it");
    const fempty = fp.flatMap((d, i) => (d ? [] : [i]));
    const cellF = (c) => page.locator(`[data-cell="${c}"]`);
    // a wrong digit, then ctrl+z takes it back
    await cellF(fempty[0]).click();
    await page.keyboard.press(String((fsol[fempty[0]] % 5) + 1));
    await expect(cellF(fempty[0])).not.toHaveAccessibleName(/, empty/);
    await page.keyboard.press('Control+z');
    await expect(cellF(fempty[0])).toHaveAccessibleName(/, empty/);
    // a hint fills the picked cell
    await cellF(fempty[1]).click();
    await page.getByRole('button', { name: 'hint' }).click();
    await expect(cellF(fempty[1])).toHaveAccessibleName(
      new RegExp(`^row \\d, column \\d, ${fsol[fempty[1]]}(,|$)`),
    );
    for (const [i, c] of fempty.entries()) {
      if (i === 1) continue;
      await cellF(c).click();
      await page.keyboard.press(String(fsol[c]));
      if (i === 4) {
        await wait(300);
        await shot('futoshiki-playing');
      }
    }
    await expect(status).toHaveText('solved.. solved with 1 hint.');
    await wait(1100);
    await shot('futoshiki-solved');

    /* word wheel --------------------------------------------------------------- */
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'open word wheel' }).click();
    await page.waitForURL('**/play/wordwheel');
    const wheel = page.getByRole('group', { name: 'the letters' });
    const letterButtons = wheel.locator('[data-letter]');
    await expect(letterButtons).toHaveCount(6);
    const wl = await letterButtons.evaluateAll((els) => els.map((el) => el.textContent.trim()));
    const slotItems = page.getByRole('list', { name: 'words in the grid' }).getByRole('listitem');
    const words6 = wheelWordsFor(wl);
    if (words6[0]?.length !== 6) throw new Error(`word wheel: no word uses all of ${wl.join('')}`);
    // the shuffle moves the letters round the wheel
    const spotsNow = () =>
      letterButtons.evaluateAll((els) =>
        els.map((el) => {
          const b = el.getBoundingClientRect();
          return `${Math.round(b.x)},${Math.round(b.y)}`;
        }),
      );
    const before = await spotsNow();
    await page.getByRole('button', { name: 'shuffle the letters' }).click();
    await wait(700);
    if ((await spotsNow()).join() === before.join()) {
      throw new Error("word wheel: the shuffle didn't move the letters");
    }
    // a hint shows one letter
    await page.getByRole('button', { name: 'hint' }).click();
    await expect(page.locator('[data-shown]')).toHaveCount(1);
    // three letters from the wheel that spell nothing: refused, nothing changes
    const known = new Set(words6);
    const junk = wl
      .flatMap((x, i) => wl.flatMap((y, j) => wl.map((z, k) => [i, j, k, x + y + z])))
      .find(([i, j, k, t]) => i !== j && j !== k && i !== k && !known.has(t))[3];
    await letterButtons.first().focus();
    await page.keyboard.type(junk);
    await expect(page.getByRole('button', { name: `send ${junk}` })).toBeVisible();
    await page.keyboard.press('Enter');
    await wait(300);
    await expect(page.locator('[data-shown]')).toHaveCount(1);
    await expect(page.getByText(/extra word/)).toHaveCount(0);
    // then every word, longest first: typed, clicked, and swiped
    const sentWords = [];
    for (const [i, w] of words6.entries()) {
      if ((await status.textContent()).startsWith('solved')) break;
      if (i === 0) {
        await letterButtons.first().focus();
        await page.keyboard.type(w);
        await page.keyboard.press('Enter');
      } else if (i === 1) {
        // one letter at a time, then the word itself sends it
        for (const k of wheelPath(wl, w)) await wheel.locator(`[data-letter="${k}"]`).click();
        await page.getByRole('button', { name: `send ${w}` }).click();
      } else {
        await swipeWheel(page, wl, w);
      }
      sentWords.push(w);
      await wait(120);
      if (i === 3) {
        await wait(400);
        await shot('wordwheel-playing');
      }
    }
    await expect(status).toHaveText('solved.. solved with 1 hint.');
    // the extra words were counted, quietly
    const gridWords = (
      await slotItems.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))
    ).map((l) => l.split(', ')[0]);
    const extraCount = sentWords.filter((w) => !gridWords.includes(w)).length;
    if (extraCount) {
      await expect(
        page.getByText(extraCount === 1 ? 'one extra word.' : `${extraCount} extra words.`),
      ).toBeVisible();
    }
    await wait(1100);
    await shot('wordwheel-solved');
    await page.getByRole('button', { name: 'race friends' }).click();
    await page.waitForURL('**/new?game=wordwheel');

    if (sockets > 0) errors.push(`${theme}: a solo game opened a connection to the room server`);
    await context.close();
  }
} catch (e) {
  errors.push(
    e instanceof Error ? e.message.split('\n').filter(Boolean).slice(0, 3).join(' | ') : String(e),
  );
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(
  'sudoku, zip, hangman, word search, futoshiki and word wheel played on your own in both themes. all good.',
);

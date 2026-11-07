// two phones play a whole game of bingo in a room, through the real server.
// checks the flow (start a room, join with the code, share link, start,
// take turns, win), that each phone only ever receives its own card, and
// that a refresh keeps your seat. saves .shots/room-*.png.
// usage: pnpm play:room [url]   (needs `pnpm dev`, which runs the web app and the server)

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

/** one phone. records every room view its socket receives. */
async function phone(name, theme) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await context.addInitScript(`localStorage.setItem('lull:theme', '${theme}')`);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
  const received = [];
  page.on('websocket', (ws) => {
    ws.on('framereceived', (frame) => {
      if (typeof frame.payload === 'string') received.push(frame.payload);
    });
  });
  return {
    context,
    page,
    received,
    shot: (s) => page.screenshot({ path: `.shots/room-${s}-${theme}.png` }),
  };
}

try {
  for (const theme of ['light', 'dark']) {
    const ana = await phone('ana', theme);
    const ben = await phone('ben', theme);

    /* ana starts a room from the bingo card ------------------------------- */
    await ana.page.goto(base, { waitUntil: 'networkidle' });
    await ana.page.getByRole('button', { name: 'open bingo' }).click();
    await ana.page.waitForURL('**/new?game=bingo');
    await ana.page.getByLabel('your name').fill('ana');
    await ana.shot('new');
    await ana.page.getByRole('button', { name: 'start a room' }).last().click();
    await ana.page.waitForURL(/\/r\/[A-Z]{4}$/);
    const code = ana.page.url().split('/r/')[1];
    await expect(ana.page.getByText('waiting for the others...')).toBeVisible();

    /* ben joins with the code -------------------------------------------- */
    await ben.page.goto(base, { waitUntil: 'networkidle' });
    await ben.page.getByRole('button', { name: 'join', exact: true }).click();
    await ben.page.getByLabel('room code').fill(code.toLowerCase());
    await ben.page.getByLabel('your name').fill('ben');
    await ben.shot('join');
    await ben.page.getByRole('button', { name: 'join', exact: true }).click();
    await ben.page.waitForURL(`**/r/${code}`);
    await expect(ben.page.getByText('ana starts the game.')).toBeVisible();
    await expect(ana.page.getByText('everyone here? start when ready.')).toBeVisible();
    await wait(400);
    await ana.shot('lobby');

    /* play ------------------------------------------------------------------ */
    await ana.page.getByRole('button', { name: 'start', exact: true }).click();
    await expect(ana.page.getByRole('group', { name: 'your card' })).toBeVisible();
    await expect(ben.page.getByRole('group', { name: 'your card' })).toBeVisible();
    await expect(ana.page.locator('[aria-live="polite"]').first()).toHaveText(
      'your turn. call a number.',
    );
    await expect(ben.page.locator('[aria-live="polite"]').first()).toHaveText('ana is thinking');

    // ben can't call on ana's turn: nothing is sent, the number stays open
    const benFirst = ben.page.getByRole('button', { name: /, open$/ }).first();
    await benFirst.click({ force: true });
    await expect(ben.page.getByRole('button', { name: /, crossed off$/ })).toHaveCount(0);

    // a refresh keeps ben's seat and card
    const benCardBefore = await ben.page.getByRole('group', { name: 'your card' }).innerText();
    await ben.page.reload({ waitUntil: 'networkidle' });
    await expect(ben.page.getByRole('group', { name: 'your card' })).toBeVisible();
    expect(await ben.page.getByRole('group', { name: 'your card' }).innerText()).toBe(
      benCardBefore,
    );

    await ana.page
      .getByRole('button', { name: /, open$/ })
      .first()
      .click();
    await expect(ben.page.getByRole('button', { name: /, crossed off$/ })).toHaveCount(1);
    await wait(500);
    await ben.shot('playing');

    // take turns until someone has five lines
    const players = [ana, ben];
    for (let turn = 1; turn < 25; turn++) {
      const p = players[turn % 2];
      // wait until this phone has heard the last call: its turn now, or the game is over
      const done = /wins|you win|share it|a draw/;
      await expect(p.page.getByText(new RegExp(`your turn|${done.source}`)).first()).toBeVisible();
      if (await p.page.getByText(done).count()) break;
      await p.page
        .getByRole('button', { name: /, open$/ })
        .first()
        .click();
    }
    await expect(ana.page.getByText(/wins|you win|share it|a draw/).first()).toBeVisible();
    await expect(ben.page.getByText(/wins|you win|share it|a draw/).first()).toBeVisible();
    await wait(1300);
    await ana.shot('end-host');
    await ben.shot('end-guest');

    /* privacy: neither phone ever received the other's card ----------------- */
    const cardsIn = (p) =>
      p.received
        .map((raw) => JSON.parse(raw))
        .filter((m) => m.t === 'room' && m.room.match)
        .map((m) => m.room.match.view.card);
    const anaCards = cardsIn(ana);
    const benCards = cardsIn(ben);
    if (!anaCards.length || !benCards.length) throw new Error('no game views were received');
    const anaCard = JSON.stringify(anaCards[anaCards.length - 1]);
    const benCard = JSON.stringify(benCards[benCards.length - 1]);
    if (anaCard === benCard) throw new Error('both phones got the same card');
    for (const raw of ana.received)
      if (raw.includes(benCard.slice(1, -1))) throw new Error("ana received ben's card");
    for (const raw of ben.received)
      if (raw.includes(anaCard.slice(1, -1))) throw new Error("ben received ana's card");

    /* again, from the host ---------------------------------------------------- */
    await ana.page.getByRole('button', { name: 'again?' }).click();
    await expect(ana.page.getByText(/your turn|is thinking/).first()).toBeVisible();
    await expect(ben.page.getByRole('group', { name: 'your card' })).toBeVisible();

    await ana.context.close();
    await ben.context.close();
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
console.log('two phones played a room of bingo in both themes. cards stayed private. all good.');

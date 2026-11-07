// two pcs play every room game through the real server, the way friends
// would: one starts a room from the game's home tile, the other joins with
// the code, the host starts, and they play it to the end. it fails on any
// page error, and saves .shots/rooms-<game>-<who>.png along the way.
// usage: pnpm play:rooms [url] [game ...]   (needs `pnpm dev`)

import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import {

  solveFutoshiki,
  solveSudoku,
  solveWordSearch,
  solveZip,
  swipeWheel,
  wheelWordsFor,
} from './solvers.mjs';
/** the same, for part of the text */
const cic = (t) => new RegExp(String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');


/** a whole-string match that ignores case, since the app uses sentence case */
const ci = (t) => new RegExp(`^${String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');


const base = process.argv.slice(2).find((a) => a.startsWith('http')) ?? 'http://localhost:5173';
const only = process.argv.slice(2).filter((a) => !a.startsWith('http'));
const theme = process.env.THEME === 'dark' ? 'dark' : 'light';
const errors = [];
const passed = [];
const wait = (ms) => new Promise((r) => globalThis.setTimeout(r, ms));
const RESULT = /you win|wins|share it|a draw/i;

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

/** one pc at desktop size. keeps every room view its socket receives. */
async function pc(name) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await context.addInitScript(`localStorage.setItem('lull:theme', '${theme}')`);
  const page = await context.newPage();
  const received = [];
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/WebSocket/.test(m.text())) errors.push(`${name}: ${m.text()}`);
  });
  page.on('websocket', (ws) =>
    ws.on('framereceived', (f) => typeof f.payload === 'string' && received.push(f.payload)),
  );
  /** the newest room this pc was sent */
  const room = () => {
    for (let i = received.length - 1; i >= 0; i--) {
      const m = JSON.parse(received[i]);
      if (m.t === 'room') return m.room;
    }
    return null;
  };
  /** the newest game view this pc was sent */
  const view = () => room()?.match?.view ?? null;
  /** this pc has been told it's its turn */
  const myTurn = () => {
    const r = room();
    return !!r?.match && !r.match.status.over && r.match.status.turn === r.you;
  };
  return { context, page, name, view, room, myTurn };
}

async function until(fn, what, ms = 8000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error(`waited for ${what}`);
    await wait(80);
  }
}

/** start a room from a home tile, join from the second pc, set options, start */
async function roomFor(title, ana, ben, options = []) {
  await ana.page.goto(base, { waitUntil: 'networkidle' });
  await ana.page.getByRole('button', { name: `open ${title}` }).click();
  // puzzles open on your own first. from there, a room with friends is one click.
  await ana.page.waitForURL(/\/(new|play\/[a-z0-9]+)(\?|$)/);
  if (ana.page.url().includes('/play/')) {
    await ana.page.getByRole('button', { name: /^(race friends|play with friends)$/i }).click();
    await ana.page.waitForURL('**/new?game=*');
  }
  // from a card, the game is already chosen: no list of other games to pick from
  await expect(ana.page.getByRole('group', { name: 'game' })).toHaveCount(0);
  await ana.page.getByLabel('your name').fill('ana');
  await ana.page.getByRole('button', { name: 'start a room' }).last().click();
  await ana.page.waitForURL(/\/r\/[A-Z]{4}$/);
  const code = ana.page.url().split('/r/')[1];
  await ben.page.goto(`${base}/join`, { waitUntil: 'networkidle' });
  await ben.page.getByLabel('room code').fill(code);
  await ben.page.getByLabel('your name').fill('ben');
  await ben.page.getByRole('button', { name: /^join$/i }).click();
  await expect(ana.page.getByText('everyone here? start when ready.')).toBeVisible();
  // games for one can start before anyone joins, so wait until ben is really in the room
  await until(() => ana.room()?.seats.filter((s) => s.connected).length === 2, 'ben to arrive');
  for (const [group, value] of options) {
    await ana.page.getByRole('group', { name: group }).getByRole('button', { name: value }).click();
    await expect(ben.page.getByText(ci(value))).toBeVisible();
  }
  await ana.page.getByRole('button', { name: /^start$/i }).click();
  await until(() => ana.view() && ben.view(), 'the game to start');
}

/** both pcs have heard about the last move */
const settled = (ana, ben, ok) =>
  until(() => ok(ana.view()) && ok(ben.view()), 'both pcs to hear the move');

/** whoever the server says has the turn, once their screen says so too */
async function mover(pcs) {
  const p = await until(() => pcs.find((x) => x.myTurn()), 'someone to have the turn');
  await expect(p.page.locator('[aria-live="polite"]').first()).toHaveText(/^your turn|^you, /i);
  return p;
}

const shot = (p, slug, step) =>
  p.page.screenshot({ path: `.shots/rooms-${slug}-${step}-${p.name}-${theme}.png` });

const ended = async (ana, ben) => {
  await expect(ana.page.getByText(RESULT).first()).toBeVisible({ timeout: 15000 });
  await expect(ben.page.getByText(RESULT).first()).toBeVisible({ timeout: 15000 });
};

/* the games ----------------------------------------------------------------- */

const games = {
  async 'tic tac toe'(ana, ben, slug) {
    await shot(ana, slug, 'start');
    // a move taken back, with the other player's okay
    const first = await mover([ana, ben]);
    const other = first === ana ? ben : ana;
    await first.page.getByRole('button', { name: /^row 2, column 2, empty/i }).click();
    await settled(ana, ben, (v) => v.board.filter(Boolean).length === 1);
    await first.page.getByRole('button', { name: 'ask to take back your move' }).click();
    await expect(other.page.getByText(/wants to take that move back\.$/i)).toBeVisible();
    await expect(first.page.getByText('asked to take it back...')).toBeVisible();
    await shot(other, slug, 'takeback');
    await other.page.getByRole('button', { name: 'let them' }).click();
    await settled(ana, ben, (v) => v.board.every((c) => c === null));
    // ctrl+z can't ask again: once per move
    await expect(
      first.page.getByRole('button', { name: 'ask to take back your move' }),
    ).toBeDisabled();

    for (const [n, [r, c]] of [
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
      [1, 3],
    ].entries()) {
      const p = await mover([ana, ben]);
      await p.page
        .getByRole('button', { name: new RegExp(`^row ${r}, column ${c}, empty`, "i") })
        .click();
      await settled(ana, ben, (v) => v.board.filter(Boolean).length === n + 1);
    }
    await ended(ana, ben);
    await expect(ana.page.getByText('you win').first()).toBeVisible();
    await shot(ana, slug, 'end');
    // back from the room goes where ana came from: the tic tac toe screen she
    // started the room from (or home). the name form isn't in the way.
    await ana.page.getByRole('button', { name: /^back$/i }).click();
    await ana.page.waitForURL((u) => ['/', '/play/tictactoe'].includes(new URL(u).pathname));
    // ben opened the join page straight from an address, so back goes home too
    await ben.page.getByRole('button', { name: /^back$/i }).click();
    await ben.page.waitForURL((u) => new URL(u).pathname === '/');
  },

  async squares(ana, ben, slug) {
    const edges = [
      'row 1, dots 1 to 2',
      'row 2, dots 1 to 2',
      'column 1, dots 1 to 2',
      'column 2, dots 1 to 2',
    ];
    for (const [n, where] of edges.entries()) {
      const p = await mover([ana, ben]);
      await p.page.getByRole('button', { name: new RegExp(`^line, ${where}, open`, "i") }).click();
      await settled(ana, ben, (v) => v.edges.filter((e) => e !== null).length === n + 1);
      if (n === 0) {
        // asked to take it back, and the other player keeps it
        const other = p === ana ? ben : ana;
        await p.page.keyboard.press('Control+z');
        await other.page.getByRole('button', { name: 'keep it' }).click();
        await expect(p.page.getByText('asked to take it back...')).toHaveCount(0);
        await settled(ana, ben, (v) => v.edges.filter((e) => e !== null).length === 1);
      }
    }
    await expect(ana.page.getByText(/go again|goes again/i).first()).toBeVisible();
    await expect(ben.page.getByText(/go again|goes again/i).first()).toBeVisible();
    await shot(ana, slug, 'box');
  },

  async "nine men's morris"(ana, ben, slug) {
    for (const [n, spot] of ['a7', 'a4', 'd7', 'b6', 'g7'].entries()) {
      const p = await mover([ana, ben]);
      await p.page.getByRole('button', { name: new RegExp(`^${spot},`, "i") }).click();
      await settled(ana, ben, (v) => v.board.filter((x) => x !== null).length === n + 1);
    }
    await expect(ana.page.getByText(/remove one/i).first()).toBeVisible();
    await expect(ben.page.getByText(/remove one/i).first()).toBeVisible();
    await shot(ana, slug, 'mill');
  },

  async bingo(ana, ben, slug) {
    await expect(ana.page.getByRole('group', { name: 'your card' })).toBeVisible();
    await expect(ben.page.getByRole('group', { name: 'your card' })).toBeVisible();
    for (let turn = 0; turn < 25; turn++) {
      const p = turn % 2 === 0 ? ana : ben;
      await expect(
        p.page.getByText(new RegExp(`your turn|${RESULT.source}`, "i")).first(),
      ).toBeVisible();
      if (await p.page.getByText(RESULT).count()) break;
      await p.page
        .getByRole('button', { name: /, open$/ })
        .first()
        .click();
      if (turn === 6) await shot(ana, slug, 'playing');
    }
    await ended(ana, ben);
  },

  async 'connect four'(ana, ben, slug) {
    // ana stacks column 1, ben column 2. four down wins.
    for (let i = 0; i < 7; i++) {
      const p = await mover([ana, ben]);
      const col = p === ana ? 1 : 2;
      await p.page.getByRole('button', { name: new RegExp(`^column ${col}$`, "i") }).click();
      await settled(ana, ben, (v) => v.moves === i + 1);
      if (i === 4) {
        await wait(500);
        await shot(ben, slug, 'playing');
      }
    }
    await ended(ana, ben);
    await expect(ana.page.getByText('you win').first()).toBeVisible();
    await expect(ben.page.getByText('ana wins').first()).toBeVisible();
    // the column is full of discs only where they were dropped
    const v = ana.view();
    if (v.board.filter((x) => x !== null).length !== 7)
      throw new Error('connect four: wrong disc count');
    await wait(900);
    await shot(ana, slug, 'end');
  },

  async 'rock paper scissors'(ana, ben, slug) {
    const anaId = ana.view().players[0];
    for (let round = 1; round <= 3; round++) {
      await expect(ana.page.getByRole('button', { name: 'rock' })).toBeVisible({ timeout: 6000 });
      await expect(ben.page.getByRole('button', { name: 'scissors' })).toBeVisible({
        timeout: 6000,
      });
      await ana.page.getByRole('button', { name: 'rock' }).click();
      // nothing shows until both are in
      await expect(ben.page.getByText(/ready$/i).first()).toBeVisible();
      if (ben.view().throws[anaId] !== 'hidden') throw new Error("rps: ben saw ana's throw early");
      if (round === 1) await shot(ana, slug, 'thrown');
      await ben.page.getByRole('button', { name: 'scissors' }).click();
      if (round < 3) {
        await expect(ana.page.getByText('you take it').first()).toBeVisible();
        await expect(ben.page.getByText('ana takes it').first()).toBeVisible();
        if (round === 1) await shot(ben, slug, 'reveal');
      }
    }
    await ended(ana, ben);
    await expect(ana.page.getByText('you win').first()).toBeVisible();
  },

  async sudoku(ana, ben, slug) {
    const v = ana.view();
    const solution = solveSudoku(v.puzzle);
    const empty = v.puzzle.flatMap((d, i) => (d === 0 ? [i] : []));
    // one wrong digit first, then undo puts the cell back. your grid is your own.
    await ana.page.locator(`[data-cell="${empty[0]}"]`).click();
    await ana.page.keyboard.press(String((solution[empty[0]] % 9) + 1));
    await until(() => ana.view().grid[empty[0]] !== 0, 'the wrong digit to land');
    await ana.page.getByRole('button', { name: /^undo$/i }).click();
    await until(() => ana.view().grid[empty[0]] === 0, 'undo to clear the cell');
    // no hints in a race: the answer isn't on anyone's pc
    await expect(ana.page.getByRole('button', { name: 'hint' })).toHaveCount(0);
    await ana.page.keyboard.press(String((solution[empty[0]] % 9) + 1));
    for (const [n, cell] of empty.entries()) {
      await ana.page.locator(`[data-cell="${cell}"]`).click();
      await ana.page.keyboard.press(String(solution[cell]));
      if (n === 10) {
        await until(
          () => Math.max(...Object.values(ben.view().progress)) >= 81 - empty.length + 10,
          "ana's progress on ben's pc",
        );
        // ben only ever hears how far ana is, never her grid
        if (JSON.stringify(ben.view()).includes(JSON.stringify(ana.view().grid))) {
          throw new Error("sudoku: ben received ana's grid");
        }
        await shot(ana, slug, 'playing');
        await shot(ben, slug, 'racing');
      }
    }
    await ended(ana, ben);
    await expect(ana.page.getByText('you win').first()).toBeVisible();
  },

  async zip(ana, ben, slug) {
    const v = ana.view();
    const path = solveZip(v.size, v.numbers, v.count);
    if (path.length !== v.size * v.size) throw new Error('zip: no solution found by the check');
    // a drag for the first few cells, then taps for the rest
    const box = async (c) => ana.page.locator(`[data-cell="${c}"]`).boundingBox();
    const first = await box(path[0]);
    await ana.page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
    await ana.page.mouse.down();
    for (const c of path.slice(1, 8)) {
      const b = await box(c);
      await ana.page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 });
    }
    await ana.page.mouse.up();
    await until(
      () => (ben.view().progress[ana.view().players[0]] ?? 0) === 8,
      "ana's progress on ben's pc",
    );
    await shot(ana, slug, 'playing');
    // dragging back over the line pulls it back
    await ana.page.locator(`[data-cell="${path[3]}"]`).click();
    await until(() => ana.view().path?.length === 4, 'the line to pull back');
    for (const c of path.slice(4)) {
      await ana.page.locator(`[data-cell="${c}"]`).click();
      await wait(25);
    }
    await ended(ana, ben);
    await expect(ana.page.getByText('you win').first()).toBeVisible();
  },

  async 'word chain'(ana, ben, slug) {
    const say = async (p, word) => {
      await p.page.getByLabel('your word').fill(word);
      await p.page.keyboard.press('Enter');
    };
    await mover([ana]);
    const first = ana.view().letter;
    await say(ana, `${first}oot`);
    await until(() => ben.view().words.length === 1, 'the first word');
    await mover([ben]);
    await say(ben, 'tea');
    await mover([ana]);
    // the wrong letter is caught before it's sent
    await say(ana, 'zzzz');
    await expect(ana.page.getByText('it has to start with that letter.')).toBeVisible();
    await say(ana, 'apple');
    await until(() => ben.view().words.length === 3, 'the third word');
    await shot(ben, slug, 'playing');
    // ben lets the clock run out
    await expect(ana.page.getByText('you win').first()).toBeVisible({ timeout: 16000 });
    await ended(ana, ben);
  },

  async hangman(ana, ben, slug) {
    // round 1: ana sets a word, ben guesses it
    await expect(ben.page.getByText('ana is picking a word').first()).toBeVisible();
    await ana.page.getByLabel('your word').fill('cake');
    await ana.page.getByRole('button', { name: 'set it' }).click();
    await expect(ben.page.getByText('your turn. pick a letter.').first()).toBeVisible();
    if (JSON.stringify(ben.view()).includes('cake'))
      throw new Error('hangman: ben received the word');
    await ben.page.getByRole('button', { name: /^z$/i }).click();
    await expect(ben.page.getByRole('button', { name: 'z, not in the word' })).toBeVisible();
    await ben.page.getByRole('button', { name: /^c$/i }).click();
    await ben.page.keyboard.press('a');
    await expect(ana.page.getByRole('button', { name: 'a, in the word' })).toBeVisible();
    await ben.page.keyboard.press('k');
    await shot(ben, slug, 'guessing');
    await ben.page.keyboard.press('e');
    await expect(ana.page.getByText(/ben got it/i).first()).toBeVisible();
    // round 2: ben lets the app pick, ana guesses through the alphabet
    await expect(ben.page.getByRole('button', { name: 'pick one for me' })).toBeVisible({
      timeout: 6000,
    });
    await ben.page.getByRole('button', { name: 'pick one for me' }).click();
    await expect(ana.page.getByText('your turn. pick a letter.').first()).toBeVisible();
    for (const l of 'etaoinshrdlucmfwypvbgkqjxz') {
      if (await ana.page.getByText(RESULT).count()) break;
      if (ana.view().phase !== 'guess') break;
      const before = ana.view().guessed.length;
      await ana.page.getByRole('button', { name: l, exact: true }).click();
      await until(
        () => ana.view().guessed.length > before || ana.view().phase !== 'guess',
        'a guess',
      );
    }
    await ended(ana, ben);
    await wait(900);
    await shot(ana, slug, 'end');
  },

  async skribbl(ana, ben, slug) {
    const draw = async (p) => {
      const b = await p.page.locator('[data-canvas]').boundingBox();
      await p.page.mouse.move(b.x + b.width * 0.2, b.y + b.height * 0.5);
      await p.page.mouse.down();
      for (let i = 1; i <= 30; i++) {
        await p.page.mouse.move(
          b.x + b.width * (0.2 + i * 0.02),
          b.y + b.height * (0.5 - Math.sin(i / 5) * 0.2),
        );
      }
      await p.page.mouse.up();
    };
    for (const [drawer, guesser] of [
      [ana, ben],
      [ben, ana],
    ]) {
      await expect(drawer.page.getByRole('group', { name: 'pick a word to draw' })).toBeVisible({
        timeout: 6000,
      });
      if (JSON.stringify(guesser.view()).includes(JSON.stringify(drawer.view().choices))) {
        throw new Error('skribbl: the guesser received the choices');
      }
      await drawer.page
        .getByRole('group', { name: 'pick a word to draw' })
        .getByRole('button')
        .first()
        .click();
      await until(() => drawer.view().phase === 'draw', 'drawing to start');
      const word = drawer.view().word;
      if (guesser.view().word) throw new Error('skribbl: the guesser received the word');
      await draw(drawer);
      await until(() => guesser.view().strokes.length === 1, 'the stroke on the other pc');
      const pts = guesser.view().strokes[0].pts.length;
      if (pts < 40) throw new Error(`skribbl: the stroke arrived short (${pts} numbers)`);
      await guesser.page.getByPlaceholder('your guess').fill('nope');
      await guesser.page.keyboard.press('Enter');
      await expect(drawer.page.getByText('nope')).toBeVisible();
      if (drawer === ana) {
        await shot(ana, slug, 'drawing');
        await shot(ben, slug, 'guessing');
      }
      await guesser.page.getByPlaceholder('your guess').fill(word.toUpperCase());
      await guesser.page.keyboard.press('Enter');
      await expect(drawer.page.getByText(/got it\. the word was/i).first()).toBeVisible();
    }
    await ended(ana, ben);
  },

  async pictionary(ana, ben, slug) {
    // ana draws and gives it to ben
    await expect(ana.page.getByRole('group', { name: 'pick a word to draw' })).toBeVisible({
      timeout: 6000,
    });
    await ana.page
      .getByRole('group', { name: 'pick a word to draw' })
      .getByRole('button')
      .first()
      .click();
    await expect(ana.page.getByText('who said it first?')).toBeVisible();
    await expect(ben.page.getByText(/ana is drawing\. say it out loud\./i).first()).toBeVisible();
    await expect(ben.page.getByPlaceholder('your guess')).toHaveCount(0);
    const b = await ana.page.locator('[data-canvas]').boundingBox();
    await ana.page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.7);
    await ana.page.mouse.down();
    await ana.page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.3, { steps: 12 });
    await ana.page.mouse.move(b.x + b.width * 0.7, b.y + b.height * 0.7, { steps: 12 });
    await ana.page.mouse.up();
    await until(() => ben.view().strokes.length === 1, 'the stroke on the other pc');
    await shot(ana, slug, 'drawing');
    await ana.page.getByRole('button', { name: /^ben$/i }).click();
    await expect(ben.page.getByText(/you got it\. the word was/i).first()).toBeVisible();
    // ben draws, nobody gets it
    await expect(ben.page.getByRole('group', { name: 'pick a word to draw' })).toBeVisible({
      timeout: 6000,
    });
    await ben.page
      .getByRole('group', { name: 'pick a word to draw' })
      .getByRole('button')
      .last()
      .click();
    await ben.page.getByRole('button', { name: 'nobody' }).click();
    await expect(ana.page.getByText(/nobody got it\./i).first()).toBeVisible();
    await ended(ana, ben);
  },

  async sim(ana, ben, slug) {
    // first mover draws 1-2, 2-3 and then 1-3: their own triangle, so they lose
    const lines = [
      ['line', 1, 2],
      ['dots', 4, 5],
      ['dots', 2, 3],
      // an upright side: its box has no width, so the check uses the dots
      ['dots', 5, 6],
      ['dots', 1, 3],
    ];
    const first = await mover([ana, ben]);
    const other = first === ana ? ben : ana;
    for (const [n, [how, p, q]] of lines.entries()) {
      const pc = await mover([ana, ben]);
      if (how === 'line') {
        await pc.page.getByRole('button', { name: `line from ${p} to ${q}, open` }).click();
      } else {
        await pc.page.getByRole('button', { name: new RegExp(`^dot ${p}$`, 'i') }).click();
        await expect(pc.page.getByRole('button', { name: `dot ${p}, picked` })).toBeVisible();
        await pc.page.getByRole('button', { name: new RegExp(`^dot ${q}$`, 'i') }).click();
      }
      await settled(ana, ben, (v) => v.edges.filter((e) => e !== null).length === n + 1);
      if (n === 1) {
        // the second mover takes their line back, with the first one's okay
        await other.page.getByRole('button', { name: 'ask to take back your move' }).click();
        await first.page.getByRole('button', { name: 'let them' }).click();
        await settled(ana, ben, (v) => v.edges.filter((e) => e !== null).length === 1);
        await other.page.getByRole('button', { name: /^dot 4$/i }).click();
        await other.page.getByRole('button', { name: /^dot 5$/i }).click();
        await settled(ana, ben, (v) => v.edges.filter((e) => e !== null).length === 2);
        await wait(400);
        await shot(first, slug, 'playing');
      }
    }
    await ended(ana, ben);
    await expect(other.page.getByText('you win').first()).toBeVisible();
    const v = ana.view();
    if (JSON.stringify(v.triangle) !== '[0,1,2]') throw new Error(`sim: triangle ${v.triangle}`);
    await wait(900);
    await shot(first, slug, 'end');
  },

  async 'word search'(ana, ben, slug) {
    const v = ana.view();
    const anaId = ana.room().you;
    for (const p of [ana, ben]) {
      if (!Array.isArray(p.view().found)) {
        const r = p.room();
        throw new Error(
          `word search: ${p.name} isn't playing (game ${r.game}, you ${r.you}, players ${r.match?.players})`,
        );
      }
    }
    const spots = solveWordSearch(v.size, v.grid, v.words);
    for (const [i, w] of v.words.entries()) {
      const [from, to] = spots[w];
      await ana.page.locator(`[data-cell="${from}"]`).click();
      await ana.page.locator(`[data-cell="${to}"]`).click();
      await until(() => ana.view().found.length === i + 1, `${w} to be found`);
      if (i === 2) {
        await until(() => ben.view().progress[anaId] === 3, "ana's count on ben's pc");
        // ben hears how many, never which or where
        const seen = JSON.stringify(ben.room());
        if (ben.view().found.length !== 0 || seen.includes('"placed"')) {
          throw new Error("word search: ben could see ana's finds or the answers");
        }
        await shot(ana, slug, 'playing');
        await shot(ben, slug, 'racing');
      }
    }
    await ended(ana, ben);
    await expect(ana.page.getByText('you win').first()).toBeVisible();
  },

  async futoshiki(ana, ben, slug) {
    const v = ana.view();
    const n = v.size;
    const sol = solveFutoshiki(n, v.puzzle, v.right, v.below);
    const empty = v.puzzle.flatMap((d, i) => (d ? [] : [i]));
    // a wrong digit, then undo
    await ana.page.locator(`[data-cell="${empty[0]}"]`).click();
    await ana.page.keyboard.press(String((sol[empty[0]] % n) + 1));
    await until(() => ana.view().grid[empty[0]] !== 0, 'the wrong digit');
    await ana.page.getByRole('button', { name: /^undo$/i }).click();
    await until(() => ana.view().grid[empty[0]] === 0, 'undo');
    await expect(ana.page.getByRole('button', { name: 'hint' })).toHaveCount(0);
    for (const [i, c] of empty.entries()) {
      await ana.page.locator(`[data-cell="${c}"]`).click();
      await ana.page.keyboard.press(String(sol[c]));
      if (i === 3) {
        await until(
          () => Math.max(...Object.values(ben.view().progress)) > n * n - empty.length + 3,
          'progress',
        );
        if (JSON.stringify(ben.view()).includes(JSON.stringify(ana.view().grid))) {
          throw new Error("futoshiki: ben received ana's grid");
        }
        await shot(ana, slug, 'playing');
      }
    }
    await ended(ana, ben);
    await expect(ana.page.getByText('you win').first()).toBeVisible();
  },

  async 'name place animal thing'(ana, ben, slug) {
    const anaId = ana.room().you;
    const fields = ['name', 'place', 'animal', 'thing'];
    for (let round = 1; round <= 3; round++) {
      await until(
        () => ana.view().phase === 'write' && ana.view().round === round,
        `round ${round}`,
      );
      const l = ana.view().letter;
      // ana writes all four, ben writes two, one of them the same as ana's
      const anaWords = [`${l}ob`, `${l}ome`, `${l}at`, `${l}all`];
      for (const [i, word] of anaWords.entries()) {
        await ana.page.getByLabel(ci(fields[i])).fill(word);
      }
      await ben.page.getByLabel(ci('name')).fill(`${l}ob`);
      await ben.page.getByLabel(ci('animal')).fill(`${l}ee`);
      // what ana writes stays on ana's pc until the round is read out
      await until(() => ben.view().filled[anaId] === 4, "ana's count on ben's pc");
      if (ben.view().answers[anaId] !== null) throw new Error("npat: ben saw ana's answers early");
      if (round === 1) await shot(ana, slug, 'writing');
      await ana.page.getByRole('button', { name: /^stop$/i }).click();
      await expect(ben.page.getByText('ana said stop.').first()).toBeVisible();
      // reading out: everyone's answers, with what they score
      await until(() => ben.view().phase === 'check', 'reading out');
      await expect(ben.page.getByRole('table', { name: "this round's answers" })).toBeVisible();
      await expect(
        ben.page.getByRole('button', { name: new RegExp(`^ana, thing, ${l}all, 10 points`, "i") }),
      ).toBeVisible();
      await expect(
        ben.page.getByRole('button', { name: new RegExp(`^ana, name, ${l}ob, 5 points`, "i") }),
      ).toBeVisible();
      if (round === 1) {
        // with two players, one flag is a majority of the others: it's struck
        await ben.page.getByRole('button', { name: new RegExp(`^ana, animal, ${l}at`, "i") }).click();
        // on ana's own screen she's "you"
        await expect(
          ana.page.getByRole('button', { name: new RegExp(`^you, animal, ${l}at, struck`, "i") }),
        ).toBeVisible();
        await shot(ben, slug, 'reading');
      }
      await ana.page.getByRole('button', { name: 'done reading' }).click();
      await expect(ana.page.getByText(/waiting for the others · 1 of 2 ready/i)).toBeVisible();
      await ben.page.getByRole('button', { name: 'done reading' }).click();
    }
    await ended(ana, ben);
    // ana: 5 + 10 + 10 + 10 a round, minus the struck animal in round one
    await expect(ana.page.getByText('you win').first()).toBeVisible();
    const final = ana.view();
    if (final.scores[final.players.indexOf(anaId)] !== 35 * 3 - 10) {
      throw new Error(`npat: ana scored ${final.scores[final.players.indexOf(anaId)]}`);
    }
    await wait(900);
    await shot(ana, slug, 'end');
  },

  async consequences(ana, ben, slug) {
    const anaId = ana.room().you;
    const label = {
      who: 'who is this about?',
      met: 'who did they meet?',
      where: 'where?',
      then: 'what happened next?',
      everyone: 'and what did everyone say?',
    };
    if (ana.view().prompts.length !== 5) throw new Error('consequences: not the short game');
    for (let step = 0; step < 5; step++) {
      await until(
        () => ana.view().step === step && ben.view().step === step && ben.view().phase === 'write',
        `line ${step + 1}`,
      );
      if (step > 0) {
        // each sees only the line just above the fold. with two, that's the other's last one.
        if (
          ana.view().above !== `ben wrote ${step - 1}` ||
          ben.view().above !== `ana wrote ${step - 1}`
        ) {
          throw new Error(`consequences: wrong line above at step ${step}`);
        }
        await expect(ana.page.getByText(ci(`ben wrote ${step - 1}`))).toBeVisible();
      }
      const field = label[ana.view().prompt];
      await ana.page.getByLabel(ci(field)).fill(`ana wrote ${step}`);
      await ana.page.getByRole('button', { name: 'fold and pass it on' }).click();
      await expect(ana.page.getByText('folded and passed. 1 of 2 done.')).toBeVisible();
      // what ana just wrote, and anything further up the sheet, stays off ben's pc
      await until(() => ben.view().done.includes(anaId), "ana's tick on ben's pc");
      const seen = JSON.stringify(ben.room());
      if (
        seen.includes(`ana wrote ${step}`) ||
        (step >= 2 && seen.includes(`ben wrote ${step - 2}`)) ||
        ben.view().stories !== null
      ) {
        throw new Error('consequences: ben could see past the fold');
      }
      if (step === 1) {
        await shot(ana, slug, 'passed');
        await shot(ben, slug, 'writing');
      }
      await ben.page.getByLabel(ci(field)).fill(`ben wrote ${step}`);
      await ben.page.getByLabel(ci(field)).press('Enter');
    }
    await settled(ana, ben, (v) => v.phase === 'done');
    for (const p of [ana, ben]) {
      await expect(p.page.getByText('every sheet, unfolded.').first()).toBeVisible();
    }
    // the first story is the sheet the first player started: their lines and the other's, in turn
    const [one, two] = ana.view().players[0] === anaId ? ['ana', 'ben'] : ['ben', 'ana'];
    const first = ana.page.getByRole('list', { name: 'story 1 of 2' });
    await expect(first.getByRole('listitem')).toHaveCount(5);
    await expect(first).toContainText(cic(`${one} wrote 0`));
    await expect(first).toContainText(cic(`met ${two} wrote 1`));
    await expect(first).toContainText(cic(`then ${two} wrote 3`));
    await expect(ana.page.getByRole('button', { name: 'previous' })).toBeDisabled();
    await wait(1200);
    await shot(ana, slug, 'unfolded');
    await ana.page.getByRole('button', { name: 'next story' }).click();
    const second = ana.page.getByRole('list', { name: 'story 2 of 2' });
    await expect(second).toContainText(cic(`${two} wrote 0`));
    await expect(second).toContainText(cic(`met ${one} wrote 1`));
    await expect(ana.page.getByRole('button', { name: 'next story' })).toBeDisabled();
  },

  async 'one-word story'(ana, ben, slug) {
    const story = [
      'once',
      'upon',
      'a',
      'time,',
      'a',
      'small',
      'dog',
      'found',
      'a',
      'very',
      'old',
      'hat.',
    ];
    const whose = () => until(() => [ana, ben].find((p) => p.myTurn()), 'someone to have the turn');
    let p = await whose();
    const other = p === ana ? ben : ana;
    // only the one whose turn it is can type
    await expect(other.page.getByLabel('your word')).toBeDisabled();
    // not a word: refused on the spot, nothing is sent
    await p.page.getByLabel('your word').fill('...');
    await p.page.getByLabel('your word').press('Enter');
    await expect(p.page.getByText('one word, no spaces. a mark at the end is fine.')).toBeVisible();
    // too soon to end it. the pill is aria-disabled, which playwright won't click
    // by itself, but a person can, and gets the nudge
    await p.page.getByRole('button', { name: 'the end, after 12 words' }).click({ force: true });
    await wait(400);
    if (p.view().words.length !== 0 || p.view().ended) {
      throw new Error('one-word story: a refused move went through');
    }
    for (const [i, word] of story.entries()) {
      p = await whose();
      await p.page.getByLabel('your word').fill(word);
      await p.page.getByLabel('your word').press('Enter');
      await settled(ana, ben, (v) => v.words.length === i + 1);
      if (i === 6) await shot(p, slug, 'writing');
    }
    const told = ben
      .view()
      .words.map((w) => w.word)
      .join(' ');
    if (told !== story.join(' ')) throw new Error(`one-word story: the story reads "${told}"`);
    if (new Set(ben.view().words.map((w) => w.by)).size !== 2) {
      throw new Error('one-word story: the turns did not alternate');
    }
    p = await whose();
    await p.page.getByRole('button', { name: /^the end$/i }).click();
    await settled(ana, ben, (v) => v.ended === 'the-end');
    for (const q of [ana, ben]) {
      await expect(q.page.getByText(/said the end\./i).first()).toBeVisible();
      await expect(q.page.getByLabel('the story so far')).toContainText(cic('the end.'));
      await expect(q.page.getByLabel('your word')).toHaveCount(0);
    }
    await wait(600);
    await shot(ben, slug, 'end');
  },

  async 'word wheel'(ana, ben, slug) {
    const anaId = ana.room().you;
    const { letters, slots } = ana.view();
    if (letters.length !== 5) throw new Error(`word wheel: ${letters.length} letters, not 5`);
    // in a race the answer never reaches anyone's pc, so there's no hint
    await expect(ana.page.getByRole('button', { name: 'hint' })).toHaveCount(0);
    const words = wheelWordsFor(letters);
    let sent = 0;
    for (const w of words) {
      if (ana.view().winner) break;
      const before = ana.view().found.length + ana.view().extra.length;
      await swipeWheel(ana.page, letters, w);
      sent++;
      await until(
        () => ana.view().found.length + ana.view().extra.length === before + 1,
        `${w} to land`,
      );
      if (sent === 3) {
        await until(() => ben.view().progress[anaId] >= 1, "ana's count on ben's pc");
        // ben hears how many, never which words or where
        const seen = JSON.stringify(ben.room());
        const leaked = words.filter((x) => seen.includes(`"${x}"`));
        if (leaked.length || ben.view().shown.some(Boolean) || 'bonus' in ben.view()) {
          throw new Error(`word wheel: ben could see ana's words (${leaked.join(', ')})`);
        }
        await shot(ana, slug, 'playing');
        await shot(ben, slug, 'racing');
      }
    }
    await ended(ana, ben);
    await expect(ana.page.getByText('you win').first()).toBeVisible();
    // once it's won, the whole grid shows on ben's pc too
    const squares = new Set(slots.flatMap((s) => s.cells)).size;
    await until(() => ben.view().shown.filter(Boolean).length === squares, 'the grid on ben');
    await expect(ben.page.locator('[data-shown]')).toHaveCount(squares);
    await wait(900);
    await shot(ben, slug, 'end');
  },
};

const options = {
  'word chain': [['time', '10s']],
  skribbl: [['rounds', '1 round']],
  'name place animal thing': [['rounds', '3 rounds']],
  consequences: [['lines', '5 lines']],
  'word wheel': [['letters', '5 letters']],
  'one-word story': [
    ['words', '30 words'],
    ['time', '30s'],
  ],
};

try {
  for (const [title, play] of Object.entries(games)) {
    if (only.length && !only.some((o) => title.includes(o))) continue;
    const before = errors.length;
    const ana = await pc('ana');
    const ben = await pc('ben');
    const slug = title.replace(/[^a-z]+/g, '-');
    try {
      await roomFor(title, ana, ben, options[title]);
      await play(ana, ben, slug);
    } catch (e) {
      const lines = e instanceof Error ? e.message.split('\n').filter(Boolean).slice(0, 3) : [e];
      errors.push(`${title}: ${lines.join(' | ')}`);
      await shot(ana, slug, 'failed').catch(() => {});
      await shot(ben, slug, 'failed').catch(() => {});
    } finally {
      await ana.context.close();
      await ben.context.close();
    }
    if (errors.length === before) passed.push(title);
    console.log(`${title}: ${errors.length === before ? 'ok' : 'FAILED'}`);
  }
} finally {
  await browser.close();
}

console.log(`passed: ${passed.length} (${passed.join(', ')})`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`every room game played to the end on two pcs (${theme}). all good.`);

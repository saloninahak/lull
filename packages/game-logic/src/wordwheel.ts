import { nextFloat, seedFrom, shuffle, type Seed } from './rng.ts';
import {
  asRecord,
  checkPlayers,
  type Game,
  type MoveResult,
  type Player,
  type Status,
} from './types.ts';
import { isWheelWord, wheelWordList } from './wheelwords.ts';

/**
 * word wheel (readme 7.19), like words of wonders. a wheel of five to seven
 * letters and a small crossword with no clues. spell a word from the wheel,
 * each letter once, and if it's in the grid it drops into place. other
 * real words count as extra words. the grid is done when every square shows.
 * alone, a hint shows one letter. with friends it's a race on the same wheel.
 */

export type WheelSize = 5 | 6 | 7;
export const WHEEL_SIZES: readonly WheelSize[] = [5, 6, 7];
/** how many words a grid holds, at least and at most */
export const WHEEL_GRID_WORDS: Record<WheelSize, { min: number; max: number }> = {
  5: { min: 4, max: 6 },
  6: { min: 5, max: 8 },
  7: { min: 6, max: 10 },
};
/** a grid never grows past this many squares across or down, so it fits the screen */
export const WHEEL_SPAN: Record<WheelSize, number> = { 5: 8, 6: 9, 7: 10 };
export const WHEEL_WORD_MIN = 3;

export type WheelSlot = { word: string; cells: number[]; across: boolean };

export type WordWheelOptions = { letters?: WheelSize };

export type WordWheelState = {
  players: string[];
  /** the wheel, in the order it starts in */
  letters: string[];
  width: number;
  height: number;
  /** one entry per square, row by row: its letter, or null where there's no square */
  grid: Array<string | null>;
  /** the grid's words, in reading order */
  slots: WheelSlot[];
  /** every other word these letters make. never sent to anyone. */
  bonus: string[];
  found: Record<string, string[]>;
  extra: Record<string, string[]>;
  /** squares shown by a hint */
  hinted: Record<string, number[]>;
  winner: string | null;
};

export type WordWheelMove = { type: 'word'; word: string } | { type: 'hint' };
export type WordWheelError =
  | 'game-over'
  | 'not-a-player'
  | 'bad-move'
  | 'too-short'
  | 'not-in-wheel'
  | 'not-a-word'
  | 'already-found'
  | 'solo-only'
  | 'nothing-left';

export type WordWheelView = {
  players: string[];
  letters: string[];
  width: number;
  height: number;
  /** where each word sits, and whether all of it shows for you. the words themselves stay hidden. */
  slots: Array<{ cells: number[]; across: boolean; done: boolean }>;
  /** the letters you can see, by square. everything shows once someone has won. */
  shown: Array<string | null>;
  /** squares you've shown with a hint */
  hinted: number[];
  /** your grid words and extra words, or null when watching */
  found: string[] | null;
  extra: string[] | null;
  /** grid words done, per player */
  progress: Record<string, number>;
  winner: string | null;
};

const A = 'a'.charCodeAt(0);

function counts(letters: Iterable<string>): number[] {
  const c = new Array<number>(26).fill(0);
  for (const ch of letters) {
    const i = ch.charCodeAt(0) - A;
    if (i >= 0 && i < 26) c[i]!++;
  }
  return c;
}

/** whether a word can be spelled from these letters, each used once */
export function spellable(word: string, letters: readonly string[]): boolean {
  if (!/^[a-z]+$/.test(word)) return false;
  const have = counts(letters);
  for (const ch of word) {
    const i = ch.charCodeAt(0) - A;
    if (--have[i]! < 0) return false;
  }
  return true;
}

/** every known word of three letters or more these letters spell, longest first */
export function wheelWordsFrom(letters: readonly string[]): string[] {
  return wheelWordList()
    .filter((w) => w.length >= WHEEL_WORD_MIN && w.length <= letters.length)
    .filter((w) => spellable(w, letters))
    .sort((a, b) => b.length - a.length || (a < b ? -1 : 1));
}

type Square = { ch: string; across: boolean; down: boolean };
type Placed = { word: string; r: number; c: number; across: boolean };

/**
 * lay words out as a crossword, the first one across. each new word crosses
 * at least one already there, and its new letters never touch another word
 * side by side, so every run of letters in the grid is one of its words.
 */
function layout(first: string, others: readonly string[], max: number, span: number): Placed[] {
  const squares = new Map<string, Square>();
  const key = (r: number, c: number) => `${r},${c}`;
  const at = (r: number, c: number) => squares.get(key(r, c));
  const box = { r0: 0, r1: 0, c0: 0, c1: first.length - 1 };
  const placed: Placed[] = [];

  const put = (p: Placed) => {
    const [dr, dc] = p.across ? [0, 1] : [1, 0];
    for (let i = 0; i < p.word.length; i++) {
      const r = p.r + dr * i;
      const c = p.c + dc * i;
      const sq = at(r, c) ?? { ch: p.word[i]!, across: false, down: false };
      squares.set(key(r, c), { ...sq, [p.across ? 'across' : 'down']: true });
    }
    box.r0 = Math.min(box.r0, p.r);
    box.c0 = Math.min(box.c0, p.c);
    box.r1 = Math.max(box.r1, p.r + dr * (p.word.length - 1));
    box.c1 = Math.max(box.c1, p.c + dc * (p.word.length - 1));
    placed.push(p);
  };

  /** how many words this placement crosses, or -1 when it can't go there */
  const crossings = (word: string, r0: number, c0: number, across: boolean): number => {
    const [dr, dc] = across ? [0, 1] : [1, 0];
    const n = word.length;
    if (at(r0 - dr, c0 - dc) || at(r0 + dr * n, c0 + dc * n)) return -1;
    const rows = [Math.min(box.r0, r0), Math.max(box.r1, r0 + dr * (n - 1))];
    const cols = [Math.min(box.c0, c0), Math.max(box.c1, c0 + dc * (n - 1))];
    if (rows[1]! - rows[0]! + 1 > span || cols[1]! - cols[0]! + 1 > span) return -1;
    let crossed = 0;
    for (let i = 0; i < n; i++) {
      const r = r0 + dr * i;
      const c = c0 + dc * i;
      const sq = at(r, c);
      if (sq) {
        if (sq.ch !== word[i] || (across ? sq.across : sq.down)) return -1;
        crossed++;
      } else if (at(r + dc, c + dr) || at(r - dc, c - dr)) {
        // a new letter right beside another word would spell something stray
        return -1;
      }
    }
    return crossed;
  };

  const best = (word: string): Placed | null => {
    let pick: Placed | null = null;
    let score = -Infinity;
    for (const [k, sq] of squares) {
      if (sq.across && sq.down) continue;
      const [r, c] = k.split(',').map(Number) as [number, number];
      for (let i = 0; i < word.length; i++) {
        if (word[i] !== sq.ch) continue;
        const across = !sq.across;
        const r0 = across ? r : r - i;
        const c0 = across ? c - i : c;
        const crossed = crossings(word, r0, c0, across);
        if (crossed < 1) continue;
        const h = Math.max(box.r1, r0 + (across ? 0 : word.length - 1)) - Math.min(box.r0, r0) + 1;
        const w = Math.max(box.c1, c0 + (across ? word.length - 1 : 0)) - Math.min(box.c0, c0) + 1;
        // cross as much as it can, stay compact, stay close to square
        const s = crossed * 1000 - h * w * 4 - Math.abs(h - w);
        if (s > score) {
          score = s;
          pick = { word, r: r0, c: c0, across };
        }
      }
    }
    return pick;
  };

  put({ word: first, r: 0, c: 0, across: true });
  const waiting = others.slice();
  // a word that didn't fit may fit once another has gone in, so go round again
  for (let grew = true; grew && placed.length < max;) {
    grew = false;
    for (const word of waiting.slice()) {
      if (placed.length >= max) break;
      const p = best(word);
      if (!p) continue;
      put(p);
      waiting.splice(waiting.indexOf(word), 1);
      grew = true;
    }
  }
  return placed;
}

/** a wheel and its grid, from a seed */
export function makeWordWheel(
  seed: Seed,
  size: WheelSize,
): Pick<WordWheelState, 'letters' | 'width' | 'height' | 'grid' | 'slots' | 'bonus'> {
  const { min, max } = WHEEL_GRID_WORDS[size];
  let s = seed;
  const [bases, s1] = shuffle(
    wheelWordList().filter((w) => w.length === size),
    s,
  );
  s = s1;

  let chosen: { base: string; placed: Placed[]; words: string[] } | null = null;
  for (const base of bases) {
    const words = wheelWordsFrom([...base]);
    if (words.length < min) continue;
    // longer words first, loosely, so the grid has a mix of lengths
    const keyed = words
      .filter((w) => w !== base)
      .map((w) => {
        const [f, next] = nextFloat(s);
        s = next;
        return { w, k: w.length + f * 2.5 };
      })
      .sort((a, b) => b.k - a.k)
      .map((x) => x.w);
    const placed = layout(base, keyed, max, WHEEL_SPAN[size]);
    if (!chosen || placed.length > chosen.placed.length) chosen = { base, placed, words };
    if (placed.length >= min) break;
  }
  if (!chosen) {
    const base = bases[0]!;
    chosen = { base, placed: [{ word: base, r: 0, c: 0, across: true }], words: [base] };
  }

  const { base, placed, words } = chosen;
  const r0 = Math.min(...placed.map((p) => p.r));
  const c0 = Math.min(...placed.map((p) => p.c));
  const end = (p: Placed) => [
    p.r + (p.across ? 0 : p.word.length - 1),
    p.c + (p.across ? p.word.length - 1 : 0),
  ];
  const height = Math.max(...placed.map((p) => end(p)[0]!)) - r0 + 1;
  const width = Math.max(...placed.map((p) => end(p)[1]!)) - c0 + 1;
  const grid: Array<string | null> = new Array(width * height).fill(null);
  const slots: WheelSlot[] = placed.map((p) => {
    const cells = Array.from({ length: p.word.length }, (_, i) => {
      const cell = (p.r - r0 + (p.across ? 0 : i)) * width + (p.c - c0 + (p.across ? i : 0));
      grid[cell] = p.word[i]!;
      return cell;
    });
    return { word: p.word, cells, across: p.across };
  });
  slots.sort((a, b) => a.cells[0]! - b.cells[0]! || (a.across ? -1 : 1));

  // the wheel never starts out spelling the long word
  const [mixed] = shuffle([...base], s);
  const letters = mixed.join('') === base ? [...mixed.slice(1), mixed[0]!] : mixed;

  const inGrid = new Set(slots.map((x) => x.word));
  const bonus = words.filter((w) => !inGrid.has(w)).sort();
  return { letters, width, height, grid, slots, bonus };
}

/** the squares a player can see: their grid words, and their hints */
export function shownSquares(
  state: Pick<WordWheelState, 'slots' | 'found' | 'hinted'>,
  id: string,
): Set<number> {
  const shown = new Set(state.hinted[id] ?? []);
  for (const word of state.found[id] ?? []) {
    for (const c of state.slots.find((x) => x.word === word)?.cells ?? []) shown.add(c);
  }
  return shown;
}

/**
 * on your own: the next square a hint shows. it picks the word closest to
 * done, and shows its first hidden letter. null when everything shows.
 */
export function wordWheelHint(
  state: Pick<WordWheelState, 'slots' | 'found' | 'hinted'>,
  id: string,
): number | null {
  const shown = shownSquares(state, id);
  let pick: { cell: number; hidden: number } | null = null;
  for (const slot of state.slots) {
    const hidden = slot.cells.filter((c) => !shown.has(c));
    if (hidden.length && (!pick || hidden.length < pick.hidden)) {
      pick = { cell: hidden[0]!, hidden: hidden.length };
    }
  }
  return pick?.cell ?? null;
}

const squareCount = (state: WordWheelState) => state.grid.filter((ch) => ch !== null).length;

/** the first to show every square wins */
const settle = (state: WordWheelState, by: string): WordWheelState =>
  shownSquares(state, by).size === squareCount(state) ? { ...state, winner: by } : state;

export const wordwheel: Game<WordWheelState, WordWheelMove, WordWheelOptions, WordWheelError> = {
  id: 'wordwheel',
  minPlayers: 1,
  maxPlayers: 8,

  init(players: Player[], options): WordWheelState {
    checkPlayers(players, 1, 8);
    const size: WheelSize = WHEEL_SIZES.includes(options?.letters as WheelSize)
      ? (options!.letters as WheelSize)
      : 6;
    const made = makeWordWheel(options?.seed ?? seedFrom('wordwheel'), size);
    const each = <T>(v: () => T) => Object.fromEntries(players.map((p) => [p.id, v()]));
    return {
      players: players.map((p) => p.id),
      ...made,
      found: each(() => []),
      extra: each(() => []),
      hinted: each(() => []),
      winner: null,
    };
  },

  view(state, viewer): WordWheelView {
    const playing = state.found[viewer] !== undefined;
    const mine = playing ? shownSquares(state, viewer) : new Set<number>();
    const progress: Record<string, number> = {};
    for (const id of state.players) {
      const s = shownSquares(state, id);
      progress[id] = state.slots.filter((x) => x.cells.every((c) => s.has(c))).length;
    }
    return {
      players: state.players,
      letters: state.letters,
      width: state.width,
      height: state.height,
      slots: state.slots.map((x) => ({
        cells: x.cells,
        across: x.across,
        done: x.cells.every((c) => mine.has(c)),
      })),
      shown: state.grid.map((ch, i) => (ch !== null && (state.winner || mine.has(i)) ? ch : null)),
      hinted: playing ? state.hinted[viewer]! : [],
      found: playing ? state.found[viewer]! : null,
      extra: playing ? state.extra[viewer]! : null,
      progress,
      winner: state.winner,
    };
  },

  apply(state, move, by): MoveResult<WordWheelState, WordWheelError> {
    if (state.winner) return { error: 'game-over' };
    const found = state.found[by];
    const extra = state.extra[by];
    if (!found || !extra) return { error: 'not-a-player' };
    const m = asRecord(move);

    if (m?.type === 'hint') {
      // the answer never reaches anyone's pc in a race, so hints are for one
      if (state.players.length > 1) return { error: 'solo-only' };
      const cell = wordWheelHint(state, by);
      if (cell === null) return { error: 'nothing-left' };
      return settle(
        { ...state, hinted: { ...state.hinted, [by]: [...state.hinted[by]!, cell] } },
        by,
      );
    }

    if (m?.type !== 'word' || typeof m.word !== 'string') return { error: 'bad-move' };
    const word = m.word.trim().toLowerCase();
    if (word.length < WHEEL_WORD_MIN) return { error: 'too-short' };
    if (!spellable(word, state.letters)) return { error: 'not-in-wheel' };
    if (found.includes(word) || extra.includes(word)) return { error: 'already-found' };
    if (state.slots.some((x) => x.word === word)) {
      return settle({ ...state, found: { ...state.found, [by]: [...found, word] } }, by);
    }
    if (state.bonus.includes(word) && isWheelWord(word)) {
      return { ...state, extra: { ...state.extra, [by]: [...extra, word] } };
    }
    return { error: 'not-a-word' };
  },

  status(state): Status {
    if (state.winner) return { winner: [state.winner], over: true };
    return { over: false };
  },
};

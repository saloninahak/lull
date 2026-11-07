import { nextInt, seedFrom, shuffle, type Seed } from './rng.ts';
import {
  asRecord,
  checkPlayers,
  type Game,
  type MoveResult,
  type Player,
  type Status,
} from './types.ts';
import { WORDS } from './words.ts';

/**
 * word search (readme 7.15). a square of letters with words hidden in
 * straight lines. find one by marking its first and last letter. on the
 * small board words read forwards only; on the bigger ones they can run
 * backwards too. everyone gets the same grid; the first to find them all
 * wins. alone, it's just you and the grid.
 */

export type WordSearchSize = 8 | 10 | 12;
export const WORDSEARCH_SIZES: readonly WordSearchSize[] = [8, 10, 12];
export const WORD_COUNT: Record<WordSearchSize, number> = { 8: 6, 10: 8, 12: 10 };

type Dir = readonly [number, number];
/** right, down, the two forward diagonals, then the same four backwards */
const ALL_DIRS: readonly Dir[] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [-1, 1],
  [0, -1],
  [-1, 0],
  [-1, -1],
  [1, -1],
];
const FORWARD_DIRS = ALL_DIRS.slice(0, 4);
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

export type Placement = { word: string; cells: number[] };

export type WordSearchOptions = { size?: WordSearchSize };

export type WordSearchState = {
  players: string[];
  size: WordSearchSize;
  /** one letter per cell, row by row */
  grid: string[];
  /** the words to find, alphabetical */
  words: string[];
  /** where each word really is. never sent to anyone during a race. */
  placed: Placement[];
  found: Record<string, Placement[]>;
  winner: string | null;
};

export type WordSearchMove = { type: 'find'; from: number; to: number };
export type WordSearchError =
  'game-over' | 'not-a-player' | 'bad-move' | 'not-a-line' | 'no-word' | 'already-found';

export type WordSearchView = Omit<WordSearchState, 'placed' | 'found'> & {
  /** your finds, or null when watching */
  found: Placement[] | null;
  /** words found per player */
  progress: Record<string, number>;
};

const reverse = (w: string) => [...w].reverse().join('');

/** the cells from one to the other along a straight line (8 ways), or null */
export function lineBetween(size: number, from: number, to: number): number[] | null {
  const n = size * size;
  if (![from, to].every((c) => Number.isInteger(c) && c >= 0 && c < n)) return null;
  const r1 = Math.floor(from / size);
  const c1 = from % size;
  const dr = Math.floor(to / size) - r1;
  const dc = (to % size) - c1;
  const len = Math.max(Math.abs(dr), Math.abs(dc));
  if (len === 0) return null;
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const sr = Math.sign(dr);
  const sc = Math.sign(dc);
  return Array.from({ length: len + 1 }, (_, i) => (r1 + sr * i) * size + c1 + sc * i);
}

/** a grid with words hidden in it, from a seed */
export function makeWordSearch(
  seed: Seed,
  size: WordSearchSize,
): { grid: string[]; words: string[]; placed: Placement[] } {
  const dirs = size === 8 ? FORWARD_DIRS : ALL_DIRS;
  let s = seed;
  const [pool, s1] = shuffle(
    WORDS.filter((w) => w.length >= 3 && w.length <= size && /^[a-z]+$/.test(w)),
    s,
  );
  s = s1;
  const cells: Array<string | null> = Array(size * size).fill(null);
  const placed: Placement[] = [];
  const want = WORD_COUNT[size];

  for (const word of pool) {
    if (placed.length >= want) break;
    // no word inside another, either way round, so every find is clear
    const clash = placed.some(({ word: p }) =>
      [word, reverse(word)].some((w) => p.includes(w) || w.includes(p)),
    );
    if (clash) continue;
    let spot: number[] | null = null;
    for (let t = 0; t < 150 && !spot; t++) {
      const [d, a] = nextInt(s, dirs.length);
      const [r0, b] = nextInt(a, size);
      const [c0, c] = nextInt(b, size);
      s = c;
      const [dr, dc] = dirs[d]!;
      const endR = r0 + dr * (word.length - 1);
      const endC = c0 + dc * (word.length - 1);
      if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;
      const line = Array.from(
        { length: word.length },
        (_, i) => (r0 + dr * i) * size + c0 + dc * i,
      );
      if (line.every((cell, i) => cells[cell] === null || cells[cell] === word[i])) spot = line;
    }
    if (!spot) continue;
    spot.forEach((cell, i) => (cells[cell] = word[i]!));
    placed.push({ word, cells: spot });
  }

  const grid = cells.map((ch) => {
    if (ch) return ch;
    const [i, next] = nextInt(s, ALPHABET.length);
    s = next;
    return ALPHABET[i]!;
  });
  return { grid, words: placed.map((p) => p.word).sort(), placed };
}

/** on your own: where a word you haven't found yet starts, or null when all are found */
export function wordSearchHint(
  state: Pick<WordSearchState, 'placed' | 'words'>,
  found: readonly Placement[],
): { word: string; cell: number } | null {
  for (const word of state.words) {
    if (found.some((f) => f.word === word)) continue;
    const p = state.placed.find((x) => x.word === word);
    if (p) return { word, cell: p.cells[0]! };
  }
  return null;
}

export const wordsearch: Game<WordSearchState, WordSearchMove, WordSearchOptions, WordSearchError> =
  {
    id: 'wordsearch',
    minPlayers: 1,
    maxPlayers: 8,

    init(players: Player[], options): WordSearchState {
      checkPlayers(players, 1, 8);
      const size: WordSearchSize = WORDSEARCH_SIZES.includes(options?.size as WordSearchSize)
        ? (options!.size as WordSearchSize)
        : 10;
      const { grid, words, placed } = makeWordSearch(options?.seed ?? seedFrom('wordsearch'), size);
      return {
        players: players.map((p) => p.id),
        size,
        grid,
        words,
        placed,
        found: Object.fromEntries(players.map((p) => [p.id, []])),
        winner: null,
      };
    },

    view(state, viewer): WordSearchView {
      const progress: Record<string, number> = {};
      for (const id of state.players) progress[id] = state.found[id]!.length;
      const { placed: _placed, found, ...rest } = state;
      void _placed;
      return { ...rest, found: found[viewer] ?? null, progress };
    },

    apply(state, move, by): MoveResult<WordSearchState, WordSearchError> {
      if (state.winner) return { error: 'game-over' };
      const mine = state.found[by];
      if (!mine) return { error: 'not-a-player' };
      const m = asRecord(move);
      if (m?.type !== 'find') return { error: 'bad-move' };
      const cells = lineBetween(state.size, m.from as number, m.to as number);
      if (!cells) return { error: 'not-a-line' };
      const letters = cells.map((c) => state.grid[c]).join('');
      const back = reverse(letters);
      const matches = state.words.filter((w) => w === letters || w === back);
      const word = matches.find((w) => !mine.some((f) => f.word === w));
      if (!word) return { error: matches.length ? 'already-found' : 'no-word' };
      const found = [...mine, { word, cells: word === letters ? cells : cells.slice().reverse() }];
      return {
        ...state,
        found: { ...state.found, [by]: found },
        winner: found.length === state.words.length ? by : null,
      };
    },

    status(state): Status {
      if (state.winner) return { winner: [state.winner], over: true };
      return { over: false };
    },
  };

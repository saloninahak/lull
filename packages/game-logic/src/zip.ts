import { nextInt, seedFrom, type Seed } from './rng.ts';
import {
  asRecord,
  checkPlayers,
  type Game,
  type MoveResult,
  type Player,
  type Status,
} from './types.ts';

/**
 * zip, the path puzzle (readme 7.12, like linkedin's). draw one line that
 * fills every cell of the grid, starting at 1 and passing the numbers in
 * order, ending on the last one. everyone races the same puzzle; the
 * others only see how far along your line is.
 */

export type ZipSize = 5 | 6 | 7 | 8;
export type ZipOptions = { size?: ZipSize };
export const ZIP_SIZES: readonly ZipSize[] = [5, 6, 7, 8];

export type ZipState = {
  players: string[];
  size: ZipSize;
  /** checkpoint number per cell, 0 for none. numbers run 1..count */
  numbers: number[];
  count: number;
  paths: Record<string, number[]>;
  winner: string | null;
};

export type ZipMove = { type: 'path'; cells: number[] };
export type ZipError = 'game-over' | 'not-a-player' | 'bad-path';

export type ZipView = {
  players: string[];
  size: ZipSize;
  numbers: number[];
  count: number;
  path: number[] | null;
  /** cells covered per player */
  progress: Record<string, number>;
  winner: string | null;
};

const adjacent = (size: number, a: number, b: number) => {
  const ar = Math.floor(a / size);
  const br = Math.floor(b / size);
  return (ar === br && Math.abs(a - b) === 1) || (a % size === b % size && Math.abs(ar - br) === 1);
};

function neighbours(size: number, c: number): number[] {
  const r = Math.floor(c / size);
  const k = c % size;
  const out: number[] = [];
  if (r > 0) out.push(c - size);
  if (r < size - 1) out.push(c + size);
  if (k > 0) out.push(c - 1);
  if (k < size - 1) out.push(c + 1);
  return out;
}

/** a random path through every cell: a snake, shuffled by many "backbite" steps */
export function randomFullPath(size: number, seed: Seed): number[] {
  let path: number[] = [];
  for (let r = 0; r < size; r++) {
    for (let k = 0; k < size; k++) path.push(r * size + (r % 2 === 0 ? k : size - 1 - k));
  }
  let s = seed;
  const steps = size * size * 40;
  for (let i = 0; i < steps; i++) {
    const [flip, s1] = nextInt(s, 2);
    s = s1;
    if (flip) path = path.reverse();
    const end = path[path.length - 1]!;
    const before = path[path.length - 2];
    const options = neighbours(size, end).filter((n) => n !== before);
    const [pick, s2] = nextInt(s, options.length);
    s = s2;
    const at = path.indexOf(options[pick]!);
    // reverse the tail after the neighbour, so the end moves and it stays one path
    path = [...path.slice(0, at + 1), ...path.slice(at + 1).reverse()];
  }
  return path;
}

/** a puzzle: a hidden full path, with numbered cells along it */
export function makeZip(seed: Seed, size: ZipSize): { numbers: number[]; count: number } {
  const path = randomFullPath(size, seed);
  const count = size + 2;
  const numbers = Array<number>(size * size).fill(0);
  const last = path.length - 1;
  for (let n = 0; n < count; n++) numbers[path[Math.round((n * last) / (count - 1))]!] = n + 1;
  return { numbers, count };
}

/**
 * is this a fair start of a line? it begins on 1, each step goes to a
 * neighbouring cell, no cell twice, and numbers come in order.
 */
export function validPath(state: Pick<ZipState, 'size' | 'numbers'>, cells: readonly number[]) {
  const n = state.size * state.size;
  if (cells.length > n) return false;
  const seen = new Set<number>();
  let next = 1;
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i]!;
    if (!Number.isInteger(c) || c < 0 || c >= n || seen.has(c)) return false;
    if (i > 0 && !adjacent(state.size, cells[i - 1]!, c)) return false;
    seen.add(c);
    const num = state.numbers[c]!;
    if (num !== 0) {
      if (num !== next) return false;
      next++;
    } else if (i === 0) return false;
  }
  return true;
}

/**
 * a hint toward a known solution: one more cell along it, or, when the
 * line has left it, back to the last cell they share. `back` says which.
 */
export function zipHint(
  solution: readonly number[],
  path: readonly number[],
): { cells: number[]; back: boolean } {
  let same = 0;
  while (same < path.length && path[same] === solution[same]) same++;
  if (same < path.length) return { cells: solution.slice(0, Math.max(1, same)), back: true };
  return { cells: solution.slice(0, Math.min(path.length + 1, solution.length)), back: false };
}

export const isComplete = (state: ZipState, cells: readonly number[]) =>
  cells.length === state.size * state.size &&
  state.numbers[cells[cells.length - 1]!] === state.count &&
  validPath(state, cells);

export const zip: Game<ZipState, ZipMove, ZipOptions, ZipError> = {
  id: 'zip',
  minPlayers: 1,
  maxPlayers: 8,

  init(players: Player[], options): ZipState {
    checkPlayers(players, 1, 8);
    const size: ZipSize = ZIP_SIZES.includes(options?.size as ZipSize)
      ? (options!.size as ZipSize)
      : 6;
    const { numbers, count } = makeZip(options?.seed ?? seedFrom('zip'), size);
    return {
      players: players.map((p) => p.id),
      size,
      numbers,
      count,
      paths: Object.fromEntries(players.map((p) => [p.id, []])),
      winner: null,
    };
  },

  view(state, viewer): ZipView {
    const progress: Record<string, number> = {};
    for (const id of state.players) progress[id] = state.paths[id]!.length;
    return {
      players: state.players,
      size: state.size,
      numbers: state.numbers,
      count: state.count,
      path: state.paths[viewer] ?? null,
      progress,
      winner: state.winner,
    };
  },

  apply(state, move, by): MoveResult<ZipState, ZipError> {
    if (state.winner) return { error: 'game-over' };
    if (!state.paths[by]) return { error: 'not-a-player' };
    const cells = asRecord(move)?.cells;
    if (!Array.isArray(cells) || !validPath(state, cells as number[])) return { error: 'bad-path' };
    const path = (cells as number[]).slice();
    return {
      ...state,
      paths: { ...state.paths, [by]: path },
      winner: isComplete(state, path) ? by : null,
    };
  },

  status(state): Status {
    if (state.winner) return { winner: [state.winner], over: true };
    return { over: false };
  },
};

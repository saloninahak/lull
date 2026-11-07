import { seedFrom, shuffle, type Seed } from './rng.ts';
import {
  asRecord,
  checkPlayers,
  type Game,
  type MoveResult,
  type Player,
  type Status,
} from './types.ts';

/**
 * futoshiki (readme 7.16), a sudoku cousin. fill an n×n grid so every row
 * and column holds 1 to n once, and every sign between two cells holds.
 * puzzles come from a seed and always have exactly one answer. everyone
 * gets the same one; alone, there's undo and hints.
 */

export type FutoshikiSize = 4 | 5 | 6;
export const FUTOSHIKI_SIZES: readonly FutoshikiSize[] = [4, 5, 6];
/** a sign between two cells, read left to right or top to bottom */
export type Sign = '<' | '>' | null;

export type FutoshikiOptions = { size?: FutoshikiSize };

export type FutoshikiState = {
  players: string[];
  size: FutoshikiSize;
  /** n×n digits, 0 for an empty cell */
  puzzle: number[];
  /** right[i]: the sign between cell i and the one to its right */
  right: Sign[];
  /** below[i]: the sign between cell i and the one below it */
  below: Sign[];
  solution: number[];
  grids: Record<string, number[]>;
  winner: string | null;
};

export type FutoshikiMove = { type: 'set'; cell: number; digit: number };
export type FutoshikiError = 'game-over' | 'not-a-player' | 'out-of-range' | 'given';

export type FutoshikiView = Omit<FutoshikiState, 'solution' | 'grids'> & {
  grid: number[] | null;
  progress: Record<string, number>;
  solution: number[] | null;
};

type Board = Pick<FutoshikiState, 'size' | 'right' | 'below'>;

const ok = (sign: Sign, a: number, b: number) =>
  sign === null || a === 0 || b === 0 || (sign === '<' ? a < b : a > b);

/** can digit d go in cell c, given the row, the column and the signs around it */
function fits(b: Board, g: readonly number[], c: number, d: number): boolean {
  const n = b.size;
  const r = Math.floor(c / n);
  const k = c % n;
  for (let i = 0; i < n; i++) {
    if ((i !== k && g[r * n + i] === d) || (i !== r && g[i * n + k] === d)) return false;
  }
  // a cell that must be smaller than an empty neighbour can't be the biggest, and the other way
  const side = (sign: Sign, mineFirst: boolean, other: number) => {
    if (sign === null) return true;
    const less = (sign === '<') === mineFirst;
    if (other !== 0) return less ? d < other : d > other;
    return less ? d < n : d > 1;
  };
  if (k > 0 && !side(b.right[c - 1]!, false, g[c - 1]!)) return false;
  if (k < n - 1 && !side(b.right[c]!, true, g[c + 1]!)) return false;
  if (r > 0 && !side(b.below[c - n]!, false, g[c - n]!)) return false;
  if (r < n - 1 && !side(b.below[c]!, true, g[c + n]!)) return false;
  return true;
}

/** the digits that could still go in a cell */
export function futoshikiCandidates(b: Board, g: readonly number[], c: number): number[] {
  return Array.from({ length: b.size }, (_, i) => i + 1).filter((d) => fits(b, g, c, d));
}

/** how many answers a puzzle has, counting no further than `limit` */
export function countFutoshiki(b: Board, puzzle: readonly number[], limit = 2): number {
  const g = puzzle.slice();
  let found = 0;
  const solve = (): void => {
    if (found >= limit) return;
    let best = -1;
    let bestOptions: number[] = [];
    for (let c = 0; c < g.length; c++) {
      if (g[c] !== 0) continue;
      const options = futoshikiCandidates(b, g, c);
      if (options.length === 0) return;
      if (best < 0 || options.length < bestOptions.length) {
        best = c;
        bestOptions = options;
        if (options.length === 1) break;
      }
    }
    if (best < 0) {
      found++;
      return;
    }
    for (const d of bestOptions) {
      g[best] = d;
      solve();
      if (found >= limit) break;
    }
    g[best] = 0;
  };
  solve();
  return found;
}

/** cells that break a rule (a repeat, or a sign), and which signs are broken */
export function futoshikiConflicts(
  b: Board,
  g: readonly number[],
): { cells: number[]; right: number[]; below: number[] } {
  const n = b.size;
  const cells = new Set<number>();
  for (let c = 0; c < g.length; c++) {
    if (g[c] === 0) continue;
    const r = Math.floor(c / n);
    const k = c % n;
    for (let i = 0; i < n; i++) {
      if ((i !== k && g[r * n + i] === g[c]) || (i !== r && g[i * n + k] === g[c])) cells.add(c);
    }
  }
  const right: number[] = [];
  const below: number[] = [];
  b.right.forEach((sign, c) => {
    if (!ok(sign, g[c]!, g[c + 1] ?? 0)) {
      right.push(c);
      cells.add(c).add(c + 1);
    }
  });
  b.below.forEach((sign, c) => {
    if (!ok(sign, g[c]!, g[c + n] ?? 0)) {
      below.push(c);
      cells.add(c).add(c + n);
    }
  });
  return { cells: [...cells].sort((x, y) => x - y), right, below };
}

/** a full grid where every row and column has 1 to n once */
function latinSquare(seed: Seed, n: number): [number[], Seed] {
  let s = seed;
  const take = <T>(items: readonly T[]) => {
    const [out, next] = shuffle(items, s);
    s = next;
    return out;
  };
  const range = Array.from({ length: n }, (_, i) => i);
  const rows = take(range);
  const cols = take(range);
  const digits = take(range.map((i) => i + 1));
  const grid = Array.from({ length: n * n }, (_, i) => {
    const r = rows[Math.floor(i / n)]!;
    const c = cols[i % n]!;
    return digits[(r + c) % n]!;
  });
  return [grid, s];
}

/** a puzzle with exactly one answer: a few givens and some signs */
export function makeFutoshiki(
  seed: Seed,
  size: FutoshikiSize,
): Pick<FutoshikiState, 'puzzle' | 'right' | 'below' | 'solution'> {
  const n = size;
  const [solution, s1] = latinSquare(seed, n);
  const right: Sign[] = solution.map((v, i) =>
    i % n < n - 1 ? (v < solution[i + 1]! ? '<' : '>') : null,
  );
  const below: Sign[] = solution.map((v, i) =>
    i < n * (n - 1) ? (v < solution[i + n]! ? '<' : '>') : null,
  );
  // the puzzle starts empty and gains clues, mostly signs, until it has one answer.
  // adding is cheap: a puzzle with many answers shows two of them quickly.
  const board: Board = {
    size,
    right: Array<Sign>(n * n).fill(null),
    below: Array<Sign>(n * n).fill(null),
  };
  const puzzle = Array<number>(n * n).fill(0);
  let s = s1;
  const signs = [
    ...right.flatMap((x, i) => (x ? [['right', i] as const] : [])),
    ...below.flatMap((x, i) => (x ? [['below', i] as const] : [])),
  ];
  const [signOrder, s2] = shuffle(signs, s);
  const [cellOrder, s3] = shuffle(
    Array.from({ length: n * n }, (_, i) => i),
    s2,
  );
  s = s3;
  let si = 0;
  let ci = 0;
  for (let step = 0; countFutoshiki(board, puzzle) !== 1; step++) {
    // every fourth clue is a given number, the rest are signs
    if ((step % 4 === 3 || si >= signOrder.length) && ci < cellOrder.length) {
      const c = cellOrder[ci++]!;
      puzzle[c] = solution[c]!;
    } else {
      const [which, i] = signOrder[si++]!;
      (which === 'right' ? board.right : board.below)[i] =
        which === 'right' ? right[i]! : below[i]!;
    }
  }

  // then any given the signs make unnecessary goes, so the numbers do less of the work
  const [givenOrder] = shuffle(
    puzzle.flatMap((d, i) => (d ? [i] : [])),
    s,
  );
  for (const c of givenOrder) {
    const keep = puzzle[c]!;
    puzzle[c] = 0;
    if (countFutoshiki(board, puzzle) !== 1) puzzle[c] = keep;
  }

  return { puzzle, right: board.right, below: board.below, solution };
}

/** on your own: correct a wrong digit, else fill the chosen cell, else the easiest one */
export function futoshikiHint(
  state: Pick<FutoshikiState, 'size' | 'right' | 'below' | 'puzzle' | 'solution'>,
  grid: readonly number[],
  chosen: number | null = null,
): { cell: number; digit: number } | null {
  const { puzzle, solution } = state;
  const wrong = (c: number) => grid[c] !== 0 && grid[c] !== solution[c];
  const fix = (c: number) => ({ cell: c, digit: solution[c]! });
  if (chosen !== null && puzzle[chosen] === 0 && (wrong(chosen) || grid[chosen] === 0)) {
    return fix(chosen);
  }
  const firstWrong = grid.findIndex((_, c) => wrong(c));
  if (firstWrong >= 0) return fix(firstWrong);
  let best = -1;
  let fewest = Infinity;
  for (let c = 0; c < grid.length; c++) {
    if (grid[c] !== 0) continue;
    const k = futoshikiCandidates(state, grid, c).length;
    if (k < fewest) {
      best = c;
      fewest = k;
    }
  }
  return best >= 0 ? fix(best) : null;
}

export const futoshiki: Game<FutoshikiState, FutoshikiMove, FutoshikiOptions, FutoshikiError> = {
  id: 'futoshiki',
  minPlayers: 1,
  maxPlayers: 8,

  init(players: Player[], options): FutoshikiState {
    checkPlayers(players, 1, 8);
    const size: FutoshikiSize = FUTOSHIKI_SIZES.includes(options?.size as FutoshikiSize)
      ? (options!.size as FutoshikiSize)
      : 5;
    const made = makeFutoshiki(options?.seed ?? seedFrom('futoshiki'), size);
    return {
      players: players.map((p) => p.id),
      size,
      ...made,
      grids: Object.fromEntries(players.map((p) => [p.id, made.puzzle.slice()])),
      winner: null,
    };
  },

  view(state, viewer): FutoshikiView {
    const progress: Record<string, number> = {};
    for (const id of state.players) progress[id] = state.grids[id]!.filter((d) => d !== 0).length;
    const { solution, grids, ...rest } = state;
    return {
      ...rest,
      grid: grids[viewer] ?? null,
      progress,
      solution: state.winner ? solution : null,
    };
  },

  apply(state, move, by): MoveResult<FutoshikiState, FutoshikiError> {
    if (state.winner) return { error: 'game-over' };
    const grid = state.grids[by];
    if (!grid) return { error: 'not-a-player' };
    const m = asRecord(move);
    const cell = m?.cell;
    const digit = m?.digit;
    const n = state.size;
    if (!Number.isInteger(cell) || (cell as number) < 0 || (cell as number) >= n * n) {
      return { error: 'out-of-range' };
    }
    if (!Number.isInteger(digit) || (digit as number) < 0 || (digit as number) > n) {
      return { error: 'out-of-range' };
    }
    if (state.puzzle[cell as number] !== 0) return { error: 'given' };
    const next = grid.slice();
    next[cell as number] = digit as number;
    const solved = next.every((d, i) => d === state.solution[i]);
    return { ...state, grids: { ...state.grids, [by]: next }, winner: solved ? by : null };
  },

  status(state): Status {
    if (state.winner) return { winner: [state.winner], over: true };
    return { over: false };
  },
};

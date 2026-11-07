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
 * sudoku race (readme 7.11). everyone gets the same puzzle, made from a
 * seed, with exactly one solution. you fill your own grid; the others only
 * see how many cells you've filled. the first to finish a correct grid wins.
 */

export type SudokuLevel = 'easy' | 'medium' | 'hard';
export type SudokuOptions = { level?: SudokuLevel };
export const SUDOKU_LEVELS: readonly SudokuLevel[] = ['easy', 'medium', 'hard'];

/**
 * clues the generator aims to leave per level. it only takes a clue away
 * when the puzzle keeps exactly one solution, so hard can end a few above.
 */
const CLUES: Record<SudokuLevel, number> = { easy: 40, medium: 32, hard: 26 };

export type SudokuState = {
  players: string[];
  level: SudokuLevel;
  /** 81 digits, 0 for an empty cell */
  puzzle: number[];
  solution: number[];
  grids: Record<string, number[]>;
  winner: string | null;
};

export type SudokuMove = { type: 'set'; cell: number; digit: number };
export type SudokuError = 'game-over' | 'not-a-player' | 'out-of-range' | 'given';

export type SudokuView = {
  players: string[];
  level: SudokuLevel;
  puzzle: number[];
  /** your own grid, or null when watching */
  grid: number[] | null;
  /** filled cells per player (givens included), out of 81 */
  progress: Record<string, number>;
  winner: string | null;
  /** shown to everyone once the race is over */
  solution: number[] | null;
};

const row = (c: number) => Math.floor(c / 9);
const col = (c: number) => c % 9;
const box = (c: number) => Math.floor(row(c) / 3) * 3 + Math.floor(col(c) / 3);

/** the cells that share a row, column or box with this one */
export const PEERS: readonly (readonly number[])[] = Array.from({ length: 81 }, (_, c) =>
  Array.from({ length: 81 }, (_, o) => o).filter(
    (o) => o !== c && (row(o) === row(c) || col(o) === col(c) || box(o) === box(c)),
  ),
);

/** cells whose digit repeats in their row, column or box */
export function conflicts(grid: readonly number[]): number[] {
  return grid.flatMap((d, c) => (d !== 0 && PEERS[c]!.some((o) => grid[o] === d) ? [c] : []));
}

/** how many solutions a grid has, counting no further than `limit` */
export function countSolutions(grid: readonly number[], limit = 2): number {
  const g = grid.slice();
  let found = 0;
  const solve = (): void => {
    if (found >= limit) return;
    // the empty cell with the fewest options
    let best = -1;
    let bestOptions: number[] = [];
    for (let c = 0; c < 81; c++) {
      if (g[c] !== 0) continue;
      const used = new Set(PEERS[c]!.map((o) => g[o]));
      const options = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !used.has(d));
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

/** a full, valid grid shuffled from a seed */
function solvedGrid(seed: Seed): [number[], Seed] {
  let s = seed;
  const take = <T>(items: readonly T[]) => {
    const [out, next] = shuffle(items, s);
    s = next;
    return out;
  };
  const digits = take([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const rows = take([0, 1, 2]).flatMap((band) => take([0, 1, 2]).map((r) => band * 3 + r));
  const cols = take([0, 1, 2]).flatMap((stack) => take([0, 1, 2]).map((c) => stack * 3 + c));
  // the classic base pattern, then digits, rows and columns shuffled within the rules
  const base = (r: number, c: number) => (3 * (r % 3) + Math.floor(r / 3) + c) % 9;
  const grid = Array.from({ length: 81 }, (_, i) => digits[base(rows[row(i)]!, cols[col(i)]!)]!);
  return [grid, s];
}

/** a puzzle with one solution, and that solution */
export function makeSudoku(
  seed: Seed,
  level: SudokuLevel,
): { puzzle: number[]; solution: number[] } {
  const [solution, s] = solvedGrid(seed);
  const puzzle = solution.slice();
  const [order] = shuffle(
    Array.from({ length: 81 }, (_, i) => i),
    s,
  );
  let clues = 81;
  for (const c of order) {
    if (clues <= CLUES[level]) break;
    const keep = puzzle[c]!;
    puzzle[c] = 0;
    if (countSolutions(puzzle) !== 1) puzzle[c] = keep;
    else clues--;
  }
  return { puzzle, solution };
}

/** the digits a cell could still take, given what's around it */
export function candidates(grid: readonly number[], cell: number): number[] {
  const used = new Set(PEERS[cell]!.map((o) => grid[o]));
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !used.has(d));
}

/**
 * a hint for someone playing alone, who has the answer on their own pc:
 * a wrong digit gets corrected first (the chosen cell if it's wrong);
 * otherwise the chosen empty cell is filled; otherwise the empty cell
 * with the fewest options, which is the easiest one to see next.
 * null when the grid is already right.
 */
export function sudokuHint(
  puzzle: readonly number[],
  grid: readonly number[],
  solution: readonly number[],
  chosen: number | null = null,
): { cell: number; digit: number } | null {
  const wrong = (c: number) => grid[c] !== 0 && grid[c] !== solution[c];
  const fix = (c: number) => ({ cell: c, digit: solution[c]! });
  if (chosen !== null && puzzle[chosen] === 0 && (wrong(chosen) || grid[chosen] === 0)) {
    return fix(chosen);
  }
  const firstWrong = grid.findIndex((_, c) => wrong(c));
  if (firstWrong >= 0) return fix(firstWrong);
  let best = -1;
  let fewest = 10;
  for (let c = 0; c < 81; c++) {
    if (grid[c] !== 0) continue;
    const n = candidates(grid, c).length;
    if (n < fewest) {
      best = c;
      fewest = n;
    }
  }
  return best >= 0 ? fix(best) : null;
}

export const sudoku: Game<SudokuState, SudokuMove, SudokuOptions, SudokuError> = {
  id: 'sudoku',
  minPlayers: 1,
  maxPlayers: 8,

  init(players: Player[], options): SudokuState {
    checkPlayers(players, 1, 8);
    const level: SudokuLevel = SUDOKU_LEVELS.includes(options?.level as SudokuLevel)
      ? (options!.level as SudokuLevel)
      : 'easy';
    const { puzzle, solution } = makeSudoku(options?.seed ?? seedFrom('sudoku'), level);
    return {
      players: players.map((p) => p.id),
      level,
      puzzle,
      solution,
      grids: Object.fromEntries(players.map((p) => [p.id, puzzle.slice()])),
      winner: null,
    };
  },

  view(state, viewer): SudokuView {
    const progress: Record<string, number> = {};
    for (const id of state.players) progress[id] = state.grids[id]!.filter((d) => d !== 0).length;
    return {
      players: state.players,
      level: state.level,
      puzzle: state.puzzle,
      grid: state.grids[viewer] ?? null,
      progress,
      winner: state.winner,
      solution: state.winner ? state.solution : null,
    };
  },

  apply(state, move, by): MoveResult<SudokuState, SudokuError> {
    if (state.winner) return { error: 'game-over' };
    const grid = state.grids[by];
    if (!grid) return { error: 'not-a-player' };
    const m = asRecord(move);
    const cell = m?.cell;
    const digit = m?.digit;
    if (!Number.isInteger(cell) || (cell as number) < 0 || (cell as number) > 80) {
      return { error: 'out-of-range' };
    }
    if (!Number.isInteger(digit) || (digit as number) < 0 || (digit as number) > 9) {
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

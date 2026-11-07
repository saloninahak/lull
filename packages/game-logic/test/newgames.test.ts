import { describe, expect, it } from 'vitest';
import {
  C4_COLS,
  candidates,
  CHOOSE_MS,
  connect4,
  conflicts,
  countSolutions,
  hintLetter,
  revealCount,
  sudokuHint,
  zipHint,
  drawerOf,
  DRAW_REVEAL_MS,
  hangman,
  HANGMAN_REVEAL_MS,
  isComplete,
  makeSudoku,
  makeZip,
  MISSES,
  normalizeOptions,
  pictionary,
  randomFullPath,
  roundWinners,
  rps,
  RPS_REVEAL_MS,
  skribbl,
  sudoku,
  validPath,
  wordchain,
  zip,
  type Connect4State,
  type DrawState,
  type DrawView,
  type HangmanState,
  type HangmanView,
  type RpsView,
  type SudokuView,
  type ZipView,
} from '../src';
import { freeze, ok, players } from './helpers';

const [a, b, c] = players(3).map((p) => p.id) as [string, string, string];

/* connect four --------------------------------------------------------------- */

describe('connect four', () => {
  const drop = (s: Connect4State, cols: number[]) =>
    cols.reduce((st, col) => ok(connect4.apply(st, { col }, st.players[st.turn]!)), s);

  it('drops discs to the bottom and alternates', () => {
    const s = drop(connect4.init(players(2)), [3, 3]);
    expect(s.board[5 * C4_COLS + 3]).toBe(0);
    expect(s.board[4 * C4_COLS + 3]).toBe(1);
    expect(connect4.status(s).turn).toBe(a);
  });

  it('wins across, down and diagonally', () => {
    expect(drop(connect4.init(players(2)), [0, 0, 1, 1, 2, 2, 3]).winner).toBe(0);
    expect(drop(connect4.init(players(2)), [0, 1, 0, 1, 0, 1, 0]).winLine).toHaveLength(4);
    const diag = drop(connect4.init(players(2)), [0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3]);
    expect(connect4.status(diag)).toEqual({ winner: [a], over: true });
  });

  it('refuses a full column, the wrong turn and nonsense, without mutating', () => {
    const s = freeze(drop(connect4.init(players(2)), [0, 0, 0, 0, 0, 0]));
    expect(connect4.apply(s, { col: 0 }, a)).toEqual({ error: 'column-full' });
    expect(connect4.apply(s, { col: 1 }, b)).toEqual({ error: 'not-your-turn' });
    expect(connect4.apply(s, { col: 7 }, a)).toEqual({ error: 'out-of-range' });
    expect(connect4.legalMoves!(s, a)).toHaveLength(6);
  });

  it('calls a full frame with no four a draw', () => {
    // columns in pairs, shifted so no four line up
    const order = [0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 2, 3, 2, 3, 2, 3, 3, 2, 3, 2, 3, 2];
    let s = drop(connect4.init(players(2)), order);
    s = drop(s, [4, 5, 4, 5, 4, 5, 5, 4, 5, 4, 5, 4, 6, 6, 6, 6, 6, 6]);
    expect(s.moves).toBe(42);
    expect(connect4.status(s)).toEqual({ draw: true, over: true });
  });
});

/* rock paper scissors -------------------------------------------------------- */

describe('rock paper scissors', () => {
  it('scores whoever threw the winning shape when exactly two show', () => {
    expect(roundWinners({ [a]: 'rock', [b]: 'scissors', [c]: 'rock' })).toEqual([a, c]);
    expect(roundWinners({ [a]: 'rock', [b]: 'paper', [c]: 'scissors' })).toEqual([]);
    expect(roundWinners({ [a]: 'rock', [b]: 'rock' })).toEqual([]);
  });

  it('hides throws until everyone is in, then reveals and moves on', () => {
    let s = rps.init(players(2), { target: 3 });
    s = ok(rps.apply(s, { type: 'throw', choice: 'rock' }, a, { now: 0 }));
    expect((rps.view!(s, b) as RpsView).throws[a]).toBe('hidden');
    expect((rps.view!(s, a) as RpsView).throws[a]).toBe('rock');
    expect(rps.apply(s, { type: 'throw', choice: 'paper' }, a)).toEqual({
      error: 'already-thrown',
    });
    s = ok(rps.apply(s, { type: 'throw', choice: 'paper' }, b, { now: 100 }));
    expect(s.phase).toBe('reveal');
    expect(s.scores).toEqual([0, 1]);
    expect(rps.apply(s, { type: 'throw', choice: 'rock' }, a)).toEqual({ error: 'wait' });
    expect(rps.tick!(s, 100 + RPS_REVEAL_MS - 1)).toBe(s);
    s = rps.tick!(s, 100 + RPS_REVEAL_MS);
    expect(s.phase).toBe('throwing');
    expect(s.round).toBe(2);
  });

  it('ends at the target', () => {
    let s = rps.init(players(2), { target: 3 });
    for (let i = 0; i < 3; i++) {
      s = ok(rps.apply(s, { type: 'throw', choice: 'rock' }, a, { now: i * 10_000 }));
      s = ok(rps.apply(s, { type: 'throw', choice: 'scissors' }, b, { now: i * 10_000 }));
      s = rps.tick!(s, i * 10_000 + RPS_REVEAL_MS);
    }
    expect(rps.status(s)).toEqual({ winner: [a], over: true });
  });

  it('refuses a made-up throw', () => {
    expect(
      rps.apply(rps.init(players(2)), { type: 'throw', choice: 'lizard' as never }, a),
    ).toEqual({ error: 'bad-throw' });
  });
});

/* sudoku ---------------------------------------------------------------------- */

describe('sudoku', () => {
  it('makes puzzles with exactly one solution, from a seed', () => {
    for (const seed of [1, 2, 3]) {
      const { puzzle, solution } = makeSudoku(seed, 'medium');
      expect(countSolutions(puzzle)).toBe(1);
      expect(conflicts(solution)).toEqual([]);
      expect(solution.every((d) => d >= 1 && d <= 9)).toBe(true);
      expect(puzzle.every((d, i) => d === 0 || d === solution[i])).toBe(true);
    }
    expect(makeSudoku(5, 'easy')).toEqual(makeSudoku(5, 'easy'));
    expect(makeSudoku(5, 'easy').puzzle.filter(Boolean).length).toBeGreaterThanOrEqual(40);
  });

  it('keeps each grid private, shows progress, and the first correct grid wins', () => {
    let s = sudoku.init(players(2), { seed: 4, level: 'easy' });
    const empty = s.puzzle.flatMap((d, i) => (d === 0 ? [i] : []));
    const given = s.puzzle.findIndex((d) => d !== 0);
    expect(sudoku.apply(s, { type: 'set', cell: given, digit: 1 }, a)).toEqual({ error: 'given' });
    expect(sudoku.apply(s, { type: 'set', cell: 81, digit: 1 }, a)).toEqual({
      error: 'out-of-range',
    });
    s = ok(sudoku.apply(s, { type: 'set', cell: empty[0]!, digit: 9 }, b));
    const view = sudoku.view!(s, a) as SudokuView;
    expect(view.grid).toEqual(s.puzzle);
    expect(view.solution).toBeNull();
    expect(JSON.stringify(view)).not.toContain(JSON.stringify(s.solution));
    expect(view.progress[b]).toBe(view.progress[a]! + 1);
    for (const cell of empty)
      s = ok(sudoku.apply(s, { type: 'set', cell, digit: s.solution[cell]! }, a));
    expect(sudoku.status(s)).toEqual({ winner: [a], over: true });
  });
});

/* zip -------------------------------------------------------------------------- */

describe('zip', () => {
  it('builds a hidden path through every cell', () => {
    for (const size of [6, 7]) {
      const path = randomFullPath(size, 11);
      expect(new Set(path).size).toBe(size * size);
      for (let i = 1; i < path.length; i++) {
        const [p, q] = [path[i - 1]!, path[i]!];
        const sameRow = Math.floor(p / size) === Math.floor(q / size);
        expect((sameRow && Math.abs(p - q) === 1) || Math.abs(p - q) === size).toBe(true);
      }
    }
  });

  it('accepts a fair partial line and refuses a broken one', () => {
    const s = zip.init(players(2), { seed: 3, size: 6 });
    const one = s.numbers.indexOf(1);
    expect(validPath(s, [one])).toBe(true);
    const notOne = s.numbers.findIndex((n) => n === 0);
    expect(validPath(s, [notOne])).toBe(false);
    expect(validPath(s, [one, one])).toBe(false);
    expect(zip.apply(s, { type: 'path', cells: [notOne] }, a)).toEqual({ error: 'bad-path' });
  });

  it('wins with a full line that passes the numbers in order', () => {
    const size = 6;
    const seed = 21;
    let s = zip.init(players(2), { seed, size });
    // the generator's own path solves its puzzle
    const path = randomFullPath(size, seed);
    expect(makeZip(seed, size).numbers).toEqual(s.numbers);
    expect(isComplete(s, path)).toBe(true);
    s = ok(zip.apply(s, { type: 'path', cells: path.slice(0, 5) }, b));
    expect((zip.view!(s, a) as ZipView).progress[b]).toBe(5);
    expect((zip.view!(s, a) as ZipView).path).toEqual([]);
    s = ok(zip.apply(s, { type: 'path', cells: path }, a));
    expect(zip.status(s)).toEqual({ winner: [a], over: true });
  });
});

/* word chain -------------------------------------------------------------------- */

describe('word chain', () => {
  it('chains on the last letter, never repeats, and moves the clock', () => {
    let s = wordchain.init(players(3), { seed: 1, now: 0, seconds: 15 });
    const start = s.letter;
    expect(wordchain.apply(s, { type: 'word', word: 'zz' }, a)).toEqual({ error: 'bad-word' });
    expect(wordchain.apply(s, { type: 'word', word: `${start}ab` }, b)).toEqual({
      error: 'not-your-turn',
    });
    s = ok(
      wordchain.apply(s, { type: 'word', word: ` ${start.toUpperCase()}ane ` }, a, { now: 5 }),
    );
    expect(s.letter).toBe('e');
    expect(s.deadline).toBe(15_005);
    expect(wordchain.apply(s, { type: 'word', word: 'xylophone' }, b)).toEqual({
      error: 'wrong-letter',
    });
    s = ok(wordchain.apply(s, { type: 'word', word: 'egg' }, b, { now: 6 }));
    expect(wordchain.apply(s, { type: 'word', word: 'egg' }, c)).toEqual({ error: 'wrong-letter' });
    s = ok(wordchain.apply(s, { type: 'word', word: 'gee' }, c, { now: 7 }));
    expect(wordchain.apply(s, { type: 'word', word: 'egg' }, a)).toEqual({ error: 'used' });
  });

  it('puts out whoever runs out of time, until one is left', () => {
    let s = wordchain.init(players(3), { seed: 1, now: 0, seconds: 10 });
    expect(wordchain.tick!(s, 9_999)).toBe(s);
    s = wordchain.tick!(s, 10_000);
    expect(s.alive).toEqual([b, c]);
    expect(wordchain.status(s).turn).toBe(b);
    s = wordchain.tick!(s, 20_000);
    expect(wordchain.status(s)).toEqual({ winner: [c], over: true });
  });
});

/* hangman ---------------------------------------------------------------------- */

describe('hangman', () => {
  const guess = (s: HangmanState, letters: string) =>
    [...letters].reduce(
      (st, letter) => ok(hangman.apply(st, { type: 'guess', letter }, st.guesser!, { now: 0 })),
      s,
    );

  it('lets the setter pick a word, hidden from the guessers', () => {
    let s = hangman.init(players(3), { seed: 1 });
    expect(hangman.apply(s, { type: 'set', word: 'cake' }, b)).toEqual({ error: 'not-setter' });
    expect(hangman.apply(s, { type: 'set', word: 'c4ke' }, a)).toEqual({ error: 'bad-word' });
    s = ok(hangman.apply(s, { type: 'set', word: 'Cake' }, a));
    const theirs = hangman.view!(s, b) as HangmanView;
    expect(theirs.word).toBeNull();
    expect(theirs.mask).toEqual([null, null, null, null]);
    expect((hangman.view!(s, a) as HangmanView).word).toBe('cake');
    expect(hangman.status(s).turn).toBe(b);
  });

  it('scores letters, the finish, and a hanging for the setter', () => {
    let s = ok(
      hangman.apply(hangman.init(players(3), { seed: 1 }), { type: 'set', word: 'cake' }, a),
    );
    expect(hangman.apply(s, { type: 'guess', letter: 'c' }, c)).toEqual({ error: 'not-your-turn' });
    s = guess(s, 'cak');
    expect((hangman.view!(s, c) as HangmanView).mask).toEqual(['c', 'a', 'k', null]);
    s = guess(s, 'e');
    expect(s.phase).toBe('reveal');
    expect(s.last).toEqual({ word: 'cake', solved: true, by: c });
    // b found c and k, c found a and finished with e (+2)
    expect(s.scores).toEqual([0, 2, 4]);

    s = hangman.tick!(s, HANGMAN_REVEAL_MS);
    expect(s.phase).toBe('pick');
    expect(hangman.status(s).turn).toBe(b);
    s = ok(hangman.apply(s, { type: 'random' }, b));
    expect(s.word.length).toBeGreaterThanOrEqual(3);
    const wrong = [...'qxzjvw'].filter((l) => !s.word.includes(l)).slice(0, MISSES);
    s = guess(s, wrong.join(''));
    expect(s.last?.solved).toBe(false);
    expect(s.scores[1]).toBe(2 + 3);
  });

  it('ends once everyone has set a word', () => {
    let s = hangman.init(players(2), { seed: 2 });
    for (let round = 0; round < 2; round++) {
      s = ok(hangman.apply(s, { type: 'set', word: 'abc' }, s.players[s.setter]!));
      s = guess(s, 'abc');
      s = hangman.tick!(s, (round + 1) * 10_000);
    }
    expect(hangman.status(s).over).toBe(true);
  });
});

/* skribbl and pictionary --------------------------------------------------------- */

describe('drawing games', () => {
  const start = (game: typeof skribbl, n = 3) =>
    game.init(players(n), { seed: 1, now: 0, rounds: 1, seconds: 60 });
  const choose = (s: DrawState, now = 0) =>
    ok(skribbl.apply(s, { type: 'choose', index: 1 }, drawerOf(s), { now }));

  it('gives only the drawer the word choices and the word', () => {
    let s = start(skribbl);
    expect((skribbl.view!(s, a) as DrawView).choices).toHaveLength(3);
    expect((skribbl.view!(s, b) as DrawView).choices).toBeNull();
    expect(skribbl.apply(s, { type: 'choose', index: 0 }, b)).toEqual({ error: 'not-drawer' });
    s = choose(s);
    expect((skribbl.view!(s, a) as DrawView).word).toBe(s.word);
    expect((skribbl.view!(s, b) as DrawView).word).toBeNull();
    expect((skribbl.view!(s, b) as DrawView).hint).toBe(s.word.length);
  });

  it('picks the first word when the drawer takes too long', () => {
    const s = skribbl.tick!(start(skribbl), CHOOSE_MS);
    expect(s.phase).toBe('draw');
    expect(s.word).toBe(start(skribbl).choices[0]);
  });

  it('takes strokes from the drawer only, within the canvas', () => {
    let s = choose(start(skribbl));
    s = ok(skribbl.apply(s, { type: 'stroke', w: 1, pts: [0, 0, 10, 10] }, a));
    s = ok(skribbl.apply(s, { type: 'stroke', w: 1, pts: [20, 20], cont: true }, a));
    expect(s.strokes).toEqual([{ w: 1, pts: [0, 0, 10, 10, 20, 20] }]);
    expect(skribbl.apply(s, { type: 'stroke', w: 1, pts: [0, 0, 1, 1] }, b)).toEqual({
      error: 'not-drawer',
    });
    expect(skribbl.apply(s, { type: 'stroke', w: 1, pts: [0, 2000] }, a)).toEqual({
      error: 'bad-move',
    });
    s = ok(skribbl.apply(s, { type: 'undo' }, a));
    expect(s.strokes).toEqual([]);
  });

  it('scores typed guesses by speed, and ends the turn when everyone has it', () => {
    let s = choose(start(skribbl));
    s = ok(skribbl.apply(s, { type: 'guess', text: 'nope' }, b, { now: 1000 }));
    expect(s.misses).toEqual([{ by: b, text: 'nope' }]);
    s = ok(skribbl.apply(s, { type: 'guess', text: ` ${s.word.toUpperCase()} ` }, b, { now: 0 }));
    expect(s.scores).toEqual([20, 100, 0]);
    expect((skribbl.view!(s, b) as DrawView).word).toBe(s.word);
    expect(skribbl.apply(s, { type: 'guess', text: s.word }, b)).toEqual({
      error: 'already-guessed',
    });
    expect(skribbl.apply(s, { type: 'guess', text: 'x' }, a)).toEqual({ error: 'drawer' });
    s = ok(skribbl.apply(s, { type: 'guess', text: s.word }, c, { now: 30_000 }));
    expect(s.scores[2]).toBe(50);
    expect(s.phase).toBe('reveal');
  });

  it('passes the pencil round and ends after the last drawer', () => {
    let s = choose(start(skribbl, 2));
    s = skribbl.tick!(s, 60_000);
    expect(s.phase).toBe('reveal');
    s = skribbl.tick!(s, 60_000 + DRAW_REVEAL_MS);
    expect(drawerOf(s)).toBe(b);
    s = skribbl.tick!(skribbl.tick!(skribbl.tick!(s, 200_000), 300_000), 400_000);
    expect(skribbl.status(s).over).toBe(true);
  });

  it('pictionary: the drawer names who said it out loud', () => {
    let s = ok(pictionary.apply(start(pictionary), { type: 'choose', index: 0 }, a, { now: 0 }));
    expect(pictionary.apply(s, { type: 'guess', text: s.word }, b)).toEqual({ error: 'bad-move' });
    expect(pictionary.apply(s, { type: 'award', to: c }, b)).toEqual({ error: 'not-drawer' });
    expect(pictionary.apply(s, { type: 'award', to: a }, a)).toEqual({ error: 'bad-move' });
    s = ok(pictionary.apply(s, { type: 'award', to: c }, a, { now: 5 }));
    expect(s.scores).toEqual([1, 0, 1]);
    expect(s.phase).toBe('reveal');
  });
});

describe('hints and new options', () => {
  it('sudoku: hard leaves fewer clues, still one solution', () => {
    const easy = makeSudoku(9, 'easy').puzzle.filter(Boolean).length;
    const hard = makeSudoku(9, 'hard');
    expect(countSolutions(hard.puzzle)).toBe(1);
    expect(hard.puzzle.filter(Boolean).length).toBeLessThan(easy);
    expect(sudoku.init(players(1), { level: 'hard', seed: 9 }).level).toBe('hard');
  });

  it('sudoku: a hint fixes a wrong digit first, then the easiest empty cell', () => {
    const { puzzle, solution } = makeSudoku(4, 'easy');
    const empty = puzzle.flatMap((d, i) => (d === 0 ? [i] : []));
    const grid = puzzle.slice();
    grid[empty[0]!] = (solution[empty[0]!]! % 9) + 1;
    expect(sudokuHint(puzzle, grid, solution)).toEqual({
      cell: empty[0],
      digit: solution[empty[0]!],
    });
    // a chosen empty cell is filled before anything else
    expect(sudokuHint(puzzle, puzzle, solution, empty[3]!)).toEqual({
      cell: empty[3],
      digit: solution[empty[3]!],
    });
    // otherwise, a cell with the fewest options
    const pick = sudokuHint(puzzle, puzzle, solution)!;
    const fewest = Math.min(...empty.map((c) => candidates(puzzle, c).length));
    expect(candidates(puzzle, pick.cell)).toHaveLength(fewest);
    expect(sudokuHint(puzzle, solution, solution)).toBeNull();
  });

  it('zip: 5×5 and 8×8 boards, and a hint that steps or pulls back', () => {
    for (const size of [5, 8] as const) {
      const s = zip.init(players(1), { seed: 2, size });
      expect(s.size).toBe(size);
      expect(isComplete(s, randomFullPath(size, 2))).toBe(true);
    }
    const path = randomFullPath(6, 3);
    expect(zipHint(path, path.slice(0, 4))).toEqual({ cells: path.slice(0, 5), back: false });
    const offTrack = [...path.slice(0, 3), 999];
    expect(zipHint(path, offTrack)).toEqual({ cells: path.slice(0, 3), back: true });
    expect(zipHint(path, path)).toEqual({ cells: path, back: false });
  });

  it('hangman: a hint shows the most useful letter and costs a miss, never the last one', () => {
    expect(hintLetter('cake', ['c'])).toBe('a');
    expect(hintLetter('banana', [])).toBe('a');
    expect(hintLetter('cake', [...'cake'])).toBeNull();
    let s = ok(
      hangman.apply(hangman.init(players(2), { seed: 1 }), { type: 'set', word: 'banana' }, a),
    );
    s = ok(hangman.apply(s, { type: 'hint' }, b, { now: 0 }));
    expect(s.guessed).toEqual(['a']);
    expect(s.misses).toBe(1);
    expect(s.scores).toEqual([0, 0]);
    expect(hangman.apply(s, { type: 'hint' }, a)).toEqual({ error: 'not-setter' });
    s = { ...s, misses: MISSES - 1 };
    expect(hangman.apply(s, { type: 'hint' }, b)).toEqual({ error: 'no-hints' });
    // a hint can finish the word, but without the bonus
    let t = ok(
      hangman.apply(hangman.init(players(2), { seed: 1 }), { type: 'set', word: 'aab' }, a),
    );
    t = ok(hangman.apply(t, { type: 'guess', letter: 'b' }, b, { now: 0 }));
    t = ok(hangman.apply(t, { type: 'hint' }, b, { now: 0 }));
    expect(t.last).toEqual({ word: 'aab', solved: true, by: b });
    expect(t.scores).toEqual([0, 1]);
  });

  it('drawing: an eraser stroke, and letters shown as the clock runs down', () => {
    let s = skribbl.init(players(2), { seed: 3, now: 0, rounds: 1, seconds: 60 });
    s = ok(skribbl.apply(s, { type: 'choose', index: 0 }, drawerOf(s), { now: 0 }));
    s = ok(skribbl.apply(s, { type: 'stroke', w: 3, pts: [0, 0, 5, 5] }, drawerOf(s)));
    expect(s.strokes[0]!.w).toBe(3);
    const guesser = s.players.find((id) => id !== drawerOf(s))!;
    const shown = (st: typeof s) => (skribbl.view!(st, guesser) as DrawView).shown;
    expect(shown(s).every((ch) => ch === null)).toBe(true);
    expect(skribbl.tick!(s, 29_000)).toBe(s);
    s = skribbl.tick!(s, 30_000);
    expect(shown(s).filter(Boolean)).toHaveLength(1);
    s = skribbl.tick!(s, 45_000);
    expect(shown(s).filter(Boolean)).toHaveLength(s.word.length <= 4 ? 1 : 2);
    // the letters shown are the word's own, in place
    shown(s).forEach((ch, i) => ch && expect(ch).toBe(s.word[i]));
    // the drawer always sees the whole word
    expect((skribbl.view!(s, drawerOf(s)) as DrawView).shown.join('')).toBe(s.word);
    expect(revealCount('cat', 1)).toBe(1);
  });
});

describe('lobby options', () => {
  it('keeps only known values', () => {
    expect(normalizeOptions('skribbl', { rounds: 3, seconds: 7 })).toEqual({
      rounds: 3,
      seconds: 80,
    });
    expect(normalizeOptions('morris', { anything: 1 })).toEqual({});
  });
});

import { describe, expect, it } from 'vitest';
import {
  countFutoshiki,
  futoshiki,
  futoshikiCandidates,
  futoshikiConflicts,
  futoshikiHint,
  lineBetween,
  makeFutoshiki,
  makeWordSearch,
  normalizeOptions,
  WORD_COUNT,
  wordsearch,
  wordSearchHint,
  type FutoshikiView,
  type WordSearchState,
  type WordSearchView,
} from '../src';
import { freeze, ok, players } from './helpers';

const [a, b] = players(2).map((p) => p.id) as [string, string];

describe('word search', () => {
  it('hides the right number of words, each really there in a straight line', () => {
    for (const size of [8, 10, 12] as const) {
      for (let seed = 1; seed <= 30; seed++) {
        const { grid, words, placed } = makeWordSearch(seed, size);
        expect(grid).toHaveLength(size * size);
        expect(grid.every((ch) => /^[a-z]$/.test(ch))).toBe(true);
        expect(words).toHaveLength(WORD_COUNT[size]);
        expect([...words].sort()).toEqual(words);
        for (const p of placed) {
          const line = lineBetween(size, p.cells[0]!, p.cells[p.cells.length - 1]!);
          expect(line).toEqual(p.cells);
          expect(p.cells.map((c) => grid[c]).join('')).toBe(p.word);
        }
        // no word inside another, either way round
        for (const x of words) {
          for (const y of words) {
            if (x === y) continue;
            expect(y.includes(x) || y.includes([...x].reverse().join(''))).toBe(false);
          }
        }
      }
    }
  });

  it('reads forwards only on the small board', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const p of makeWordSearch(seed, 8).placed) {
        const [first, second] = p.cells as [number, number];
        // right, down, down-right, or up-right
        expect([1, 8, 9, -7]).toContain(second - first);
      }
    }
  });

  it('knows a straight line from anything else', () => {
    expect(lineBetween(10, 0, 3)).toEqual([0, 1, 2, 3]);
    expect(lineBetween(10, 33, 0)).toEqual([33, 22, 11, 0]);
    expect(lineBetween(10, 0, 12)).toBeNull();
    expect(lineBetween(10, 5, 5)).toBeNull();
    expect(lineBetween(10, 0, 100)).toBeNull();
  });

  const started = () => wordsearch.init(players(2), { seed: 3, size: 10 }) as WordSearchState;

  it('takes a find from either end, once, and the first to find them all wins', () => {
    let s = freeze(started());
    const [first, ...rest] = s.placed;
    const ends = (p: { cells: number[] }) => [p.cells[0]!, p.cells[p.cells.length - 1]!] as const;
    // backwards works: last letter to first
    const [x, y] = ends(first!);
    s = ok(wordsearch.apply(s, { type: 'find', from: y, to: x }, a));
    expect(s.found[a]![0]).toEqual(first);
    expect(wordsearch.apply(s, { type: 'find', from: x, to: y }, a)).toEqual({
      error: 'already-found',
    });
    // ben can still find it
    s = ok(wordsearch.apply(s, { type: 'find', from: x, to: y }, b));
    // row 1 column 1 to row 2 column 3 isn't straight in any of the eight ways
    expect(wordsearch.apply(s, { type: 'find', from: 0, to: 12 }, a)).toEqual({
      error: 'not-a-line',
    });
    for (const p of rest) {
      const [p0, p1] = ends(p);
      s = ok(wordsearch.apply(s, { type: 'find', from: p0, to: p1 }, a));
    }
    expect(s.winner).toBe(a);
    expect(wordsearch.status(s)).toEqual({ winner: [a], over: true });
    expect(wordsearch.apply(s, { type: 'find', from: 0, to: 1 }, b)).toEqual({
      error: 'game-over',
    });
  });

  it('refuses a line that spells nothing', () => {
    const s = started();
    const taken = new Set(s.placed.flatMap((p) => p.cells));
    // two free cells next to each other spell no word (words are 3 letters or more)
    const c = [...Array(100).keys()].find((i) => i % 10 < 9 && !taken.has(i))!;
    expect(wordsearch.apply(s, { type: 'find', from: c, to: c + 1 }, a)).toEqual({
      error: 'no-word',
    });
    expect(wordsearch.apply(s, { type: 'guess' } as never, a)).toEqual({ error: 'bad-move' });
    expect(wordsearch.apply(s, { type: 'find', from: 0, to: 1 }, 'nobody')).toEqual({
      error: 'not-a-player',
    });
  });

  it('never tells anyone where the words are, or what the others found', () => {
    let s = started();
    const p = s.placed[0]!;
    s = ok(wordsearch.apply(s, { type: 'find', from: p.cells[0]!, to: p.cells.at(-1)! }, a));
    const view = wordsearch.view!(s, b) as WordSearchView;
    expect('placed' in view).toBe(false);
    expect(view.found).toEqual([]);
    expect(view.progress).toEqual({ [a]: 1, [b]: 0 });
    expect((wordsearch.view!(s, a) as WordSearchView).found).toEqual([p]);
    expect(JSON.stringify(view)).not.toContain(JSON.stringify(p.cells));
  });

  it('a hint points at the start of a word not found yet', () => {
    const s = started();
    const h = wordSearchHint(s, [])!;
    expect(h.word).toBe(s.words[0]);
    expect(h.cell).toBe(s.placed.find((p) => p.word === h.word)!.cells[0]);
    expect(wordSearchHint(s, s.placed)).toBeNull();
  });
});

describe('futoshiki', () => {
  it('makes puzzles with exactly one answer, for every size, quickly', () => {
    for (const size of [4, 5, 6] as const) {
      for (let seed = 1; seed <= 6; seed++) {
        const t0 = performance.now();
        const f = makeFutoshiki(seed, size);
        // a new puzzle is made on the pc when you ask for one, so it has to be fast
        expect(performance.now() - t0).toBeLessThan(400);
        const board = { size, right: f.right, below: f.below };
        expect(countFutoshiki(board, f.puzzle)).toBe(1);
        // the answer is a latin square that keeps every sign
        for (let i = 0; i < size; i++) {
          const row = f.solution.slice(i * size, i * size + size);
          const col = f.solution.filter((_, c) => c % size === i);
          expect(new Set(row).size).toBe(size);
          expect(new Set(col).size).toBe(size);
        }
        expect(futoshikiConflicts(board, f.solution).cells).toEqual([]);
        // the givens are the answer's own
        f.puzzle.forEach((d, c) => d && expect(d).toBe(f.solution[c]));
        // some signs are left, and not too many
        const signs = [...f.right, ...f.below].filter(Boolean).length;
        expect(signs).toBeGreaterThan(0);
      }
    }
  });

  it('marks repeats and broken signs on both cells', () => {
    const board = { size: 4 as const, right: Array(16).fill(null), below: Array(16).fill(null) };
    board.right[0] = '<';
    board.below[1] = '>';
    const g = [3, 2, 0, 3, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const c = futoshikiConflicts(board, g);
    expect(c.right).toEqual([0]);
    expect(c.below).toEqual([1]);
    // 3 repeats in row one; 3 < 2 is broken; 2 > 4 is broken
    expect(c.cells).toEqual([0, 1, 3, 5]);
    expect(futoshikiCandidates(board, [0, ...g.slice(1)], 0)).toEqual([1]);
  });

  it('races on one puzzle: each grid is private, the first right one wins', () => {
    let s = futoshiki.init(players(2), { seed: 4, size: 4 });
    const empty = s.puzzle.flatMap((d, c) => (d ? [] : [c]));
    const given = s.puzzle.findIndex((d) => d !== 0);
    if (given >= 0) {
      expect(futoshiki.apply(s, { type: 'set', cell: given, digit: 1 }, a)).toEqual({
        error: 'given',
      });
    }
    expect(futoshiki.apply(s, { type: 'set', cell: 0, digit: 5 }, a)).toEqual({
      error: 'out-of-range',
    });
    s = ok(futoshiki.apply(s, { type: 'set', cell: empty[0]!, digit: s.solution[empty[0]!]! }, b));
    const view = futoshiki.view!(s, a) as FutoshikiView;
    expect(view.grid).toEqual(s.puzzle);
    expect(view.solution).toBeNull();
    expect(view.progress[b]).toBe(view.progress[a]! + 1);
    for (const c of empty) {
      s = ok(futoshiki.apply(s, { type: 'set', cell: c, digit: s.solution[c]! }, a));
    }
    expect(s.winner).toBe(a);
    expect((futoshiki.view!(s, b) as FutoshikiView).solution).toEqual(s.solution);
  });

  it('a hint corrects a wrong digit first, then fills the easiest cell', () => {
    const s = futoshiki.init(players(1), { seed: 2, size: 5 });
    const empty = s.puzzle.flatMap((d, c) => (d ? [] : [c]));
    const grid = s.puzzle.slice();
    grid[empty[0]!] = (s.solution[empty[0]!]! % 5) + 1;
    expect(futoshikiHint(s, grid)).toEqual({ cell: empty[0], digit: s.solution[empty[0]!] });
    expect(futoshikiHint(s, s.puzzle, empty[2]!)).toEqual({
      cell: empty[2],
      digit: s.solution[empty[2]!],
    });
    expect(futoshikiHint(s, s.solution)).toBeNull();
  });

  it('takes sizes from the lists only', () => {
    expect(normalizeOptions('futoshiki', { size: 6 })).toEqual({ size: 6 });
    expect(normalizeOptions('wordsearch', { size: 9 })).toEqual({ size: 10 });
    expect(futoshiki.init(players(1), { size: 9 as never }).size).toBe(5);
  });
});

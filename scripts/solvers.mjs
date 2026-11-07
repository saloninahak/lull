// small solvers so the checks can finish real puzzles. shared by
// rooms-check.mjs (the races) and solo-check.mjs (on your own).

/** a solved copy of an 81-cell sudoku, 0 for empty */
export function solveSudoku(puzzle) {
  const g = puzzle.slice();
  const ok = (c, d) => {
    const r = Math.floor(c / 9);
    const k = c % 9;
    for (let i = 0; i < 9; i++) {
      if (g[r * 9 + i] === d || g[i * 9 + k] === d) return false;
      const br = Math.floor(r / 3) * 3 + Math.floor(i / 3);
      const bk = Math.floor(k / 3) * 3 + (i % 3);
      if (g[br * 9 + bk] === d) return false;
    }
    return true;
  };
  const go = () => {
    const c = g.indexOf(0);
    if (c < 0) return true;
    for (let d = 1; d <= 9; d++) {
      if (!ok(c, d)) continue;
      g[c] = d;
      if (go()) return true;
      g[c] = 0;
    }
    return false;
  };
  go();
  return g;
}

/** a line through every cell, from 1, passing the numbers in order, ending on `count` */
export function solveZip(size, numbers, count) {
  const n = size * size;
  const near = (c) => {
    const r = Math.floor(c / size);
    const k = c % size;
    return [
      r > 0 && c - size,
      r < size - 1 && c + size,
      k > 0 && c - 1,
      k < size - 1 && c + 1,
    ].filter((x) => x !== false);
  };
  const seen = new Set();
  const path = [];
  // every cell left must still be reachable, as one piece, from the head
  const connected = () => {
    const left = [...Array(n).keys()].filter((c) => !seen.has(c));
    if (!left.length) return true;
    const head = path[path.length - 1];
    const reach = new Set([left[0]]);
    const todo = [left[0]];
    while (todo.length) {
      for (const m of near(todo.pop())) {
        if (!seen.has(m) && !reach.has(m)) {
          reach.add(m);
          todo.push(m);
        }
      }
    }
    return reach.size === left.length && near(head).some((m) => reach.has(m));
  };
  const go = (c, next) => {
    seen.add(c);
    path.push(c);
    const num = numbers[c];
    const want = num === next ? next + 1 : next;
    if (path.length === n) {
      if (num === count) return true;
    } else if (num !== count && connected()) {
      for (const m of near(c)) {
        if (seen.has(m)) continue;
        if (numbers[m] && numbers[m] !== want) continue;
        if (go(m, want)) return true;
      }
    }
    seen.delete(c);
    path.pop();
    return false;
  };
  go(numbers.indexOf(1), 1);
  return path;
}

/** where each word sits in a word search grid: its first and last cell */
export function solveWordSearch(size, grid, words) {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [-1, 1],
    [0, -1],
    [-1, 0],
    [-1, -1],
    [1, -1],
  ];
  const out = {};
  for (const word of words) {
    search: for (let start = 0; start < size * size; start++) {
      for (const [dr, dc] of dirs) {
        const r = Math.floor(start / size);
        const c = start % size;
        const er = r + dr * (word.length - 1);
        const ec = c + dc * (word.length - 1);
        if (er < 0 || er >= size || ec < 0 || ec >= size) continue;
        let ok = true;
        for (let i = 0; i < word.length && ok; i++) {
          ok = grid[(r + dr * i) * size + c + dc * i] === word[i];
        }
        if (ok) {
          out[word] = [start, er * size + ec];
          break search;
        }
      }
    }
  }
  return out;
}

/** the answer to a futoshiki: signs read left to right and top to bottom */
export function solveFutoshiki(n, puzzle, right, below) {
  const g = puzzle.slice();
  const holds = (s, a, b) => !s || !a || !b || (s === '<' ? a < b : a > b);
  const fits = (c, d) => {
    const r = Math.floor(c / n);
    const k = c % n;
    for (let i = 0; i < n; i++) if (g[r * n + i] === d || g[i * n + k] === d) return false;
    if (k > 0 && !holds(right[c - 1], g[c - 1], d)) return false;
    if (k < n - 1 && !holds(right[c], d, g[c + 1])) return false;
    if (r > 0 && !holds(below[c - n], g[c - n], d)) return false;
    if (r < n - 1 && !holds(below[c], d, g[c + n])) return false;
    return true;
  };
  const go = () => {
    const c = g.indexOf(0);
    if (c < 0) return true;
    for (let d = 1; d <= n; d++) {
      if (!fits(c, d)) continue;
      g[c] = d;
      if (go()) return true;
      g[c] = 0;
    }
    return false;
  };
  go();
  return g;
}

/**
 * every word word wheel knows that these letters spell, longest first.
 * read straight from the rules package (node runs its typescript as is),
 * so the checks and the game always agree on what a word is.
 */
export { wheelWordsFrom as wheelWordsFor } from '../packages/game-logic/src/wordwheel.ts';

/** the wheel spots a word's letters come from, each spot once */
export function wheelPath(letters, word) {
  const used = new Set();
  return [...word].map((ch) => {
    const i = letters.findIndex((l, k) => l === ch && !used.has(k));
    used.add(i);
    return i;
  });
}

/** swipe a word across the wheel on a page, the way a hand would */
export async function swipeWheel(page, letters, word) {
  const at = async (i) => {
    const b = await page.locator(`[data-letter="${i}"]`).boundingBox();
    return [b.x + b.width / 2, b.y + b.height / 2];
  };
  const path = wheelPath(letters, word);
  await page.mouse.move(...(await at(path[0])));
  await page.mouse.down();
  for (const i of path.slice(1)) await page.mouse.move(...(await at(i)), { steps: 6 });
  await page.mouse.up();
}

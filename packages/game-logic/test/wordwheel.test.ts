import { describe, expect, it } from 'vitest';
import {
  isWheelWord,
  makeWordWheel,
  normalizeOptions,
  spellable,
  WHEEL_GRID_WORDS,
  WHEEL_SPAN,
  wheelWordList,
  wheelWordsFrom,
  wordwheel,
  wordWheelHint,
  type WordWheelState,
  type WordWheelView,
} from '../src';
import { freeze, ok, players } from './helpers';

const [a, b] = players(2).map((p) => p.id) as [string, string];

/** every run of two or more letters across and down, as words */
function runs(grid: Array<string | null>, width: number, height: number): string[] {
  const out: string[] = [];
  const read = (cells: number[]) => {
    let word = '';
    for (const c of [...cells, -1]) {
      const ch = c >= 0 ? grid[c] : null;
      if (ch) word += ch;
      else {
        if (word.length >= 2) out.push(word);
        word = '';
      }
    }
  };
  for (let r = 0; r < height; r++) read(Array.from({ length: width }, (_, c) => r * width + c));
  for (let c = 0; c < width; c++) read(Array.from({ length: height }, (_, r) => r * width + c));
  return out.sort();
}

describe('word wheel words', () => {
  it('knows a good few common words, each plain and once', () => {
    const list = wheelWordList();
    expect(list.length).toBeGreaterThan(2400);
    expect(new Set(list).size).toBe(list.length);
    expect(list.every((w) => /^[a-z]{3,7}$/.test(w))).toBe(true);
    for (const w of ['color', 'colour', 'planet', 'tea', 'garden'])
      expect(isWheelWord(w)).toBe(true);
    expect(isWheelWord('xqz')).toBe(false);
  });

  it('spells from the wheel, each letter once', () => {
    expect(spellable('pea', ['a', 'p', 'e'])).toBe(true);
    expect(spellable('peep', ['p', 'e', 'e', 'x'])).toBe(false);
    expect(spellable('Pea', ['a', 'p', 'e'])).toBe(false);
    const from = wheelWordsFrom([...'planet']);
    expect(from[0]).toBe('planet');
    expect(from).toEqual(expect.arrayContaining(['plan', 'plant', 'plate', 'ant', 'lane']));
    expect(from.every((w, i) => i === 0 || w.length <= from[i - 1]!.length)).toBe(true);
  });
});

describe('word wheel', () => {
  it('makes a real crossword from the wheel, for every size, quickly', () => {
    for (const size of [5, 6, 7] as const) {
      for (let seed = 1; seed <= 25; seed++) {
        const t0 = performance.now();
        const w = makeWordWheel(seed, size);
        // made on the pc when you ask for one, so it has to be quick
        expect(performance.now() - t0).toBeLessThan(250);
        const { min, max } = WHEEL_GRID_WORDS[size];
        expect(w.letters).toHaveLength(size);
        expect(w.slots.length).toBeGreaterThanOrEqual(min);
        expect(w.slots.length).toBeLessThanOrEqual(max);
        expect(w.width).toBeLessThanOrEqual(WHEEL_SPAN[size]);
        expect(w.height).toBeLessThanOrEqual(WHEEL_SPAN[size]);
        expect(w.grid).toHaveLength(w.width * w.height);
        // one word uses the whole wheel, and the wheel doesn't start out spelling it
        const long = w.slots.find((x) => x.word.length === size)!;
        expect([...long.word].sort()).toEqual([...w.letters].sort());
        expect(w.letters.join('')).not.toBe(long.word);
        for (const slot of w.slots) {
          expect(isWheelWord(slot.word)).toBe(true);
          expect(spellable(slot.word, w.letters)).toBe(true);
          expect(slot.cells.map((c) => w.grid[c]).join('')).toBe(slot.word);
          const step = slot.across ? 1 : w.width;
          slot.cells.forEach((c, i) => i && expect(c - slot.cells[i - 1]!).toBe(step));
        }
        // every run of letters in the grid is one of its words: nothing stray
        expect(runs(w.grid, w.width, w.height)).toEqual(w.slots.map((x) => x.word).sort());
        // all one piece
        const squares = w.grid.flatMap((ch, i) => (ch ? [i] : []));
        const seen = new Set([squares[0]!]);
        for (const c of seen) {
          for (const n of [c - 1, c + 1, c - w.width, c + w.width]) {
            const sameRow = Math.floor(n / w.width) === Math.floor(c / w.width);
            if (w.grid[n] && (Math.abs(n - c) === w.width || sameRow)) seen.add(n);
          }
        }
        expect(seen.size).toBe(squares.length);
        // the extras are real words from the wheel that aren't in the grid
        const inGrid = new Set(w.slots.map((x) => x.word));
        for (const x of w.bonus) {
          expect(inGrid.has(x)).toBe(false);
          expect(spellable(x, w.letters)).toBe(true);
        }
        expect(w.bonus.length + w.slots.length).toBe(wheelWordsFrom(w.letters).length);
      }
    }
  });

  const start = (n = 2) => wordwheel.init(players(n), { seed: 7, letters: 6 }) as WordWheelState;
  const say = (s: WordWheelState, word: string, by = a) =>
    wordwheel.apply(s, { type: 'word', word }, by);

  it('drops grid words into place and counts the other real words', () => {
    let s = freeze(start());
    const [first] = s.slots;
    s = ok(say(s, first!.word.toUpperCase()));
    expect(s.found[a]).toEqual([first!.word]);
    const view = wordwheel.view!(s, a) as WordWheelView;
    for (const c of first!.cells) expect(view.shown[c]).toBe(s.grid[c]);
    expect(
      view.slots.find((x) => x.cells[0] === first!.cells[0] && x.across === first!.across)!.done,
    ).toBe(true);
    expect(say(s, first!.word)).toEqual({ error: 'already-found' });
    if (s.bonus.length) {
      const x = s.bonus[0]!;
      s = ok(say(s, x));
      expect(s.extra[a]).toEqual([x]);
      expect(say(s, x)).toEqual({ error: 'already-found' });
    }
    expect(say(s, 'ab')).toEqual({ error: 'too-short' });
    expect(say(s, 'zzzz')).toEqual({ error: 'not-in-wheel' });
    // spelled from the wheel, but not a word
    const nonsense = [...s.letters].reverse().join('').slice(0, 4);
    if (!isWheelWord(nonsense)) expect(say(s, nonsense)).toEqual({ error: 'not-a-word' });
    expect(wordwheel.apply(s, { type: 'spin' } as never, a)).toEqual({ error: 'bad-move' });
    expect(say(s, first!.word, 'nobody')).toEqual({ error: 'not-a-player' });
  });

  it('is a race: the first to fill the grid wins', () => {
    let s = start();
    // a word can show already through the words crossing it, so stop at the win
    for (const slot of s.slots) if (!s.winner) s = ok(say(s, slot.word, b));
    expect(s.winner).toBe(b);
    expect(wordwheel.status(s)).toEqual({ winner: [b], over: true });
    expect(say(s, s.slots[0]!.word)).toEqual({ error: 'game-over' });
  });

  it('never tells anyone the words, or what the others found, until someone wins', () => {
    let s = start();
    s = ok(say(s, s.slots[0]!.word));
    const ben = wordwheel.view!(s, b) as WordWheelView;
    expect(ben.shown.every((ch) => ch === null)).toBe(true);
    expect(ben.found).toEqual([]);
    expect(ben.progress).toEqual({ [a]: 1, [b]: 0 });
    const sent = JSON.stringify(ben);
    for (const x of [...s.slots.map((y) => y.word), ...s.bonus])
      expect(sent).not.toContain(`"${x}"`);
    expect('bonus' in ben).toBe(false);
    // someone watching sees the shape and nothing else
    expect((wordwheel.view!(s, 'watcher') as WordWheelView).found).toBeNull();
    // once it's won, everyone sees the whole grid
    for (const slot of s.slots.slice(1)) if (!s.winner) s = ok(say(s, slot.word));
    expect(s.winner).toBe(a);
    const after = wordwheel.view!(s, b) as WordWheelView;
    expect(after.shown).toEqual(s.grid);
    expect(after.slots.every((x) => !x.done)).toBe(true);
  });

  it('on your own, a hint shows one square, and hints alone can finish it', () => {
    let s = wordwheel.init(players(1), { seed: 11, letters: 5 }) as WordWheelState;
    const squares = s.grid.filter(Boolean).length;
    const first = wordWheelHint(s, a)!;
    s = ok(wordwheel.apply(s, { type: 'hint' }, a));
    expect(s.hinted[a]).toEqual([first]);
    let hints = 1;
    while (!s.winner) {
      s = ok(wordwheel.apply(s, { type: 'hint' }, a));
      hints++;
    }
    expect(hints).toBe(squares);
    expect(new Set(s.hinted[a]).size).toBe(squares);
    // in a race there are no hints
    expect(wordwheel.apply(start(), { type: 'hint' }, a)).toEqual({ error: 'solo-only' });
  });

  it('a hint goes to the word closest to done', () => {
    let s = wordwheel.init(players(1), { seed: 3, letters: 6 }) as WordWheelState;
    const short = [...s.slots].sort((x, y) => x.cells.length - y.cells.length)[0]!;
    // show all but the last letter of the shortest word
    s = { ...s, hinted: { [a]: short.cells.slice(0, -1) } };
    const others = s.slots.filter((x) => x !== short);
    const fewest = Math.min(
      ...others.map((x) => x.cells.filter((c) => !s.hinted[a]!.includes(c)).length),
    );
    if (fewest > 1) expect(wordWheelHint(s, a)).toBe(short.cells.at(-1));
  });

  it('only takes the sizes it knows', () => {
    expect(normalizeOptions('wordwheel', { letters: 9 })).toEqual({ letters: 6 });
    expect(normalizeOptions('wordwheel', { letters: 5 })).toEqual({ letters: 5 });
    expect(wordwheel.init(players(1), { letters: 4 as never }).letters).toHaveLength(6);
  });
});

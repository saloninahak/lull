import { describe, expect, it } from 'vitest';
import {
  bingo,
  completedLines,
  GOAL,
  lastCalled,
  LINES,
  marksOf,
  uncalled,
  type BingoState,
} from '../src';
import { freeze, ok, players } from './helpers';

const [a, b, c] = players(3).map((p) => p.id) as [string, string, string];

const ONE_TO_25 = Array.from({ length: 25 }, (_, i) => i + 1);
/** 1 to 25 written in order, row by row */
const inOrder = ONE_TO_25.slice();
/**
 * 22 to 25 sit on the main diagonal (cells 0, 6, 18, 24), so until one of
 * them is called this card can have at most three lines.
 */
const blocked = (() => {
  const card = Array<number>(25).fill(0);
  const late = [22, 23, 24, 25];
  [0, 6, 18, 24].forEach((cell, i) => (card[cell] = late[i]!));
  let n = 1;
  for (let cell = 0; cell < 25; cell++) if (card[cell] === 0) card[cell] = n++;
  return card;
})();

/** set the cards by hand */
function withCards(s: BingoState, cards: Record<string, number[]>): BingoState {
  return { ...s, cards: { ...s.cards, ...cards } };
}

/** call numbers in order, each by whoever's turn it is */
function call(s: BingoState, numbers: number[]): BingoState {
  return numbers.reduce(
    (st, number) => ok(bingo.apply(st, { type: 'call', number }, st.players[st.turn]!)),
    s,
  );
}

describe('bingo: cards', () => {
  it('writes 1 to 25 once each, shuffled, per player', () => {
    const s = bingo.init(players(8), { seed: 1 });
    for (const id of s.players) {
      expect([...s.cards[id]!].sort((x, y) => x - y)).toEqual(ONE_TO_25);
    }
    expect(s.cards[a]).not.toEqual(inOrder);
    expect(s.cards[a]).not.toEqual(s.cards[b]);
  });

  it('is repeatable for a seed and differs between seeds', () => {
    expect(bingo.init(players(3), { seed: 7 })).toEqual(bingo.init(players(3), { seed: 7 }));
    expect(bingo.init(players(3), { seed: 7 }).cards[a]).not.toEqual(
      bingo.init(players(3), { seed: 8 }).cards[a],
    );
  });

  it('takes 2 to 8 players', () => {
    expect(() => bingo.init(players(1))).toThrow();
    expect(() => bingo.init([...players(8), { id: 'p9', name: 'ivy' }])).toThrow();
    expect(bingo.status(bingo.init(players(2)))).toEqual({ turn: a, over: false });
  });
});

describe('bingo: calling', () => {
  it('takes turns calling, and crosses the number off every card', () => {
    let s = bingo.init(players(3), { seed: 2 });
    s = call(s, [13]);
    expect(s.called).toEqual([13]);
    expect(s.last).toEqual({ by: a, number: 13, newLines: { [a]: [], [b]: [], [c]: [] } });
    for (const id of s.players) {
      const marks = marksOf(s.cards[id]!, s.called);
      expect(marks.filter(Boolean)).toHaveLength(1);
      expect(s.cards[id]![marks.indexOf(true)]).toBe(13);
    }
    expect(bingo.status(s).turn).toBe(b);
    s = call(s, [4, 9]);
    expect(bingo.status(s).turn).toBe(a);
  });

  it('rejects quietly with a reason', () => {
    const s = call(bingo.init(players(2), { seed: 2 }), [13]);
    expect(bingo.apply(s, { type: 'call', number: 13 }, b)).toEqual({ error: 'already-called' });
    expect(bingo.apply(s, { type: 'call', number: 5 }, a)).toEqual({ error: 'not-your-turn' });
    expect(bingo.apply(s, { type: 'call', number: 26 }, b)).toEqual({ error: 'out-of-range' });
    expect(bingo.apply(s, { type: 'call', number: 0 }, b)).toEqual({ error: 'out-of-range' });
    expect(bingo.apply(s, { type: 'call', number: 2.5 }, b)).toEqual({ error: 'out-of-range' });
    expect(bingo.apply(s, { type: 'call', number: 5 }, 'stranger')).toEqual({
      error: 'not-a-player',
    });
  });

  it('never mutates the state it was given', () => {
    const s = freeze(bingo.init(players(2), { seed: 2 }));
    const next = ok(bingo.apply(s, { type: 'call', number: 1 }, a));
    expect(s.called).toEqual([]);
    expect(next.called).toEqual([1]);
  });

  it('lists the numbers left, for the caller only', () => {
    const s = call(bingo.init(players(2), { seed: 2 }), [1, 2, 3]);
    expect(uncalled(s)).toEqual(ONE_TO_25.slice(3));
    expect(bingo.legalMoves!(s, b)).toHaveLength(22);
    expect(bingo.legalMoves!(s, a)).toEqual([]);
    expect(lastCalled(s)).toEqual([3, 2, 1]);
  });
});

describe('bingo: lines', () => {
  it('finds rows, columns and both diagonals', () => {
    expect(LINES).toHaveLength(12);
    const marks = (cells: number[]) => Array.from({ length: 25 }, (_, i) => cells.includes(i));
    expect(completedLines(marks([0, 1, 2, 3, 4]))).toEqual([0]);
    expect(completedLines(marks([2, 7, 12, 17, 22]))).toEqual([7]);
    expect(completedLines(marks([0, 6, 12, 18, 24]))).toEqual([10]);
    expect(completedLines(marks([4, 8, 12, 16, 20]))).toEqual([11]);
    expect(completedLines(marks([0, 1, 2, 3]))).toEqual([]);
  });

  it('counts lines as they are made, and reports the new ones', () => {
    let s = withCards(bingo.init(players(2)), { [a]: inOrder, [b]: blocked });
    s = call(s, [1, 2, 3, 4]);
    expect(s.lines[a]).toEqual([]);
    s = call(s, [5]);
    expect(s.lines[a]).toEqual([0]);
    expect(s.last?.newLines[a]).toEqual([0]);
    s = call(s, [6]);
    expect(s.last?.newLines[a]).toEqual([]);
  });
});

describe('bingo: winning', () => {
  it('ends when someone reaches five lines', () => {
    const s0 = withCards(bingo.init(players(2)), { [a]: inOrder, [b]: blocked });
    // rows 1 to 4 are done at 20; 21 finishes column 1 and a diagonal
    const s20 = call(s0, ONE_TO_25.slice(0, 20));
    expect(s20.lines[a]).toHaveLength(4);
    expect(bingo.status(s20).over).toBe(false);
    expect(s20.lines[b]!.length).toBeLessThan(GOAL);

    const won = call(s20, [21]);
    expect(won.lines[a]).toEqual([0, 1, 2, 3, 5, 11]);
    expect(won.last?.newLines[a]).toEqual([5, 11]);
    expect(bingo.status(won)).toEqual({ winner: [a], over: true });
    expect(bingo.apply(won, { type: 'call', number: 22 }, b)).toEqual({ error: 'game-over' });
    expect(bingo.legalMoves!(won, b)).toEqual([]);
  });

  it('shares the win when two reach five on the same call', () => {
    const s0 = withCards(bingo.init(players(3)), { [a]: inOrder, [b]: inOrder, [c]: blocked });
    const won = call(s0, ONE_TO_25.slice(0, 21));
    expect(bingo.status(won)).toEqual({ winner: [a, b], over: true });
  });

  it('calls it a draw when everyone reaches five together', () => {
    const s0 = withCards(bingo.init(players(2)), { [a]: inOrder, [b]: inOrder });
    expect(bingo.status(call(s0, ONE_TO_25.slice(0, 21)))).toEqual({ draw: true, over: true });
  });
});

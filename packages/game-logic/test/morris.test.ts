import { describe, expect, it } from 'vitest';
import {
  ADJACENT,
  counts,
  destinations,
  drawAvailable,
  MILLS,
  morris,
  QUIET_LIMIT,
  removable,
  stageOf,
  type MorrisMove,
  type MorrisState,
  type Seat,
} from '../src';
import { freeze, ok, players } from './helpers';

const [p1, p2] = players(2).map((p) => p.id) as [string, string];

/**
 * build a moving-stage position from a layout of 24 points, written row by
 * row ("0" = first player, "1" = second, "." = empty). spaces are ignored.
 *   row 0: 0 1 2   row 1: 3 4 5   row 2: 6 7 8   row 3: 9 .. 14
 *   row 4: 15 16 17   row 5: 18 19 20   row 6: 21 22 23
 */
function position(layout: string, extra: Partial<MorrisState> = {}): MorrisState {
  const cells = layout.replace(/\s+/g, '');
  if (cells.length !== 24) throw new Error(`layout needs 24 points, got ${cells.length}`);
  const board = [...cells].map((ch) => (ch === '.' ? null : (Number(ch) as Seat)));
  const on = (seat: Seat) => board.filter((s) => s === seat).length;
  return {
    ...morris.init(players(2)),
    board,
    inHand: [0, 0],
    lost: [9 - on(0), 9 - on(1)],
    ...extra,
  };
}

/** apply moves in order, each by whoever the game is waiting on */
function run(s: MorrisState, moves: MorrisMove[]): MorrisState {
  return moves.reduce((st, m) => ok(morris.apply(st, m, morris.status(st).turn!)), s);
}

const place = (to: number): MorrisMove => ({ type: 'place', to });
const move = (from: number, to: number): MorrisMove => ({ type: 'move', from, to });
const remove = (at: number): MorrisMove => ({ type: 'remove', at });

// p1 on 0 2 16 21, p2 on 4 10 13 19. no mills, both have four pieces.
const MOVING = '0.0 .1. ... .1..1. .0. .1. 0..';

describe('morris: board', () => {
  it('has symmetric connections', () => {
    ADJACENT.forEach((list, p) => list.forEach((q) => expect(ADJACENT[q]).toContain(p)));
    expect(ADJACENT.flat()).toHaveLength(64); // 32 lines, both ways
  });

  it('puts every point in exactly two mills, each a connected line', () => {
    expect(MILLS).toHaveLength(16);
    for (let p = 0; p < 24; p++) expect(MILLS.filter((m) => m.includes(p))).toHaveLength(2);
    for (const [a, b, c] of MILLS) {
      expect(ADJACENT[a]).toContain(b);
      expect(ADJACENT[b]).toContain(c);
    }
  });
});

describe('morris: placing', () => {
  it('starts empty with nine in each hand', () => {
    const s = morris.init(players(2));
    expect(s.board.every((p) => p === null)).toBe(true);
    expect(counts(s, 0)).toEqual({ inHand: 9, onBoard: 0, lost: 0 });
    expect(stageOf(s, 0)).toBe('placing');
    expect(morris.status(s)).toEqual({ turn: p1, over: false });
    expect(morris.legalMoves!(s, p1)).toHaveLength(24);
  });

  it('alternates and rejects quietly', () => {
    const s = run(morris.init(players(2)), [place(0)]);
    expect(s.board[0]).toBe(0);
    expect(s.inHand).toEqual([8, 9]);
    expect(morris.status(s).turn).toBe(p2);
    expect(morris.apply(s, place(0), p2)).toEqual({ error: 'occupied' });
    expect(morris.apply(s, place(24), p2)).toEqual({ error: 'out-of-range' });
    expect(morris.apply(s, place(1), p1)).toEqual({ error: 'not-your-turn' });
    expect(morris.apply(s, move(0, 1), p2)).toEqual({ error: 'must-place' });
    expect(morris.apply(s, remove(0), p2)).toEqual({ error: 'not-removing' });
    expect(morris.apply(s, place(1), 'stranger')).toEqual({ error: 'not-a-player' });
  });

  it('forms a mill, then the same player removes a piece', () => {
    let s = run(morris.init(players(2)), [place(0), place(3), place(1), place(4), place(2)]);
    expect(s.removing).toBe(true);
    expect(s.last).toEqual({ kind: 'place', seat: 0, to: 2, mills: [[0, 1, 2]] });
    expect(morris.status(s).turn).toBe(p1);
    expect(removable(s)).toEqual([3, 4]);
    expect(morris.legalMoves!(s, p1)).toEqual([remove(3), remove(4)]);
    expect(morris.apply(s, place(5), p1)).toEqual({ error: 'must-remove' });
    expect(morris.apply(s, remove(0), p1)).toEqual({ error: 'own-piece' });
    expect(morris.apply(s, remove(5), p1)).toEqual({ error: 'empty' });

    s = run(s, [remove(3)]);
    expect(s.board[3]).toBeNull();
    expect(s.removing).toBe(false);
    expect(counts(s, 1)).toEqual({ inHand: 7, onBoard: 1, lost: 1 });
    expect(s.last).toEqual({ kind: 'remove', seat: 0, at: 3 });
    // pieces still in hand count, so nobody loses while placing
    expect(morris.status(s)).toEqual({ turn: p2, over: false });
  });

  it('skips removal when the opponent has nothing on the board', () => {
    const s = position('00. ... ... ...... ... ... ...', { inHand: [7, 9], lost: [0, 0] });
    const next = run(s, [place(2)]);
    expect(next.removing).toBe(false);
    expect(morris.status(next).turn).toBe(p2);
  });

  it('moves to the moving stage once the hand is empty', () => {
    let s = morris.init(players(2));
    // interleaved so that no mill ever forms
    const p1Spots = [0, 4, 8, 9, 13, 15, 19, 23, 6];
    const p2Spots = [1, 5, 7, 10, 14, 16, 18, 22, 21];
    for (let i = 0; i < 9; i++) s = run(s, [place(p1Spots[i]!), place(p2Spots[i]!)]);
    expect(s.inHand).toEqual([0, 0]);
    expect(stageOf(s, 0)).toBe('moving');
    expect(morris.apply(s, place(2), p1)).toEqual({ error: 'must-move' });
  });
});

describe('morris: moving and flying', () => {
  it('slides along a line to an empty neighbour only', () => {
    const s = position(MOVING);
    expect(stageOf(s, 0)).toBe('moving');
    expect(destinations(s, 0)).toEqual([1, 9]);
    expect(destinations(s, 4)).toEqual([]); // not p1's turn
    expect(morris.apply(s, move(0, 14), p1)).toEqual({ error: 'not-adjacent' });
    expect(morris.apply(s, move(0, 2), p1)).toEqual({ error: 'occupied' });
    expect(morris.apply(s, move(4, 1), p1)).toEqual({ error: 'not-your-piece' });
    expect(morris.apply(s, move(1, 9), p1)).toEqual({ error: 'not-your-piece' });
    expect(morris.apply(s, place(1), p1)).toEqual({ error: 'must-move' });

    const next = run(s, [move(0, 1)]);
    expect(next.board[0]).toBeNull();
    expect(next.board[1]).toBe(0);
    expect(next.quiet).toBe(1);
    expect(next.last).toEqual({ kind: 'move', seat: 0, from: 0, to: 1, mills: [] });
    expect(morris.status(next).turn).toBe(p2);
  });

  it('never mutates the state it was given', () => {
    const s = freeze(position(MOVING));
    const next = ok(morris.apply(s, move(0, 1), p1));
    expect(s.board[0]).toBe(0);
    expect(next.board[0]).toBeNull();
  });

  it('flies anywhere with exactly three pieces', () => {
    const s = position('0.0 .1. ... .1..1. ... .1. 0..');
    expect(stageOf(s, 0)).toBe('flying');
    expect(stageOf(s, 1)).toBe('moving');
    expect(destinations(s, 0)).toHaveLength(24 - 7);
    const next = run(s, [move(0, 23)]);
    expect(next.board[23]).toBe(0);
  });

  it('removes after a mill made by sliding, and resets the quiet count', () => {
    // p1 on 0 2 4 16, p2 on 10 13 18 20
    let s = position('0.0 .0. ... .1..1. .0. 1.1 ...', { quiet: 12 });
    s = run(s, [move(4, 1)]);
    expect(s.removing).toBe(true);
    expect(s.last).toMatchObject({ kind: 'move', mills: [[0, 1, 2]] });
    expect(removable(s)).toEqual([10, 13, 18, 20]);

    s = run(s, [remove(10)]);
    expect(s.quiet).toBe(0);
    // history restarts from the position after the capture
    expect(Object.values(s.seen)).toEqual([1]);
    expect(counts(s, 1)).toEqual({ inHand: 0, onBoard: 3, lost: 6 });
    // three left is still alive, and now flying
    expect(morris.status(s)).toEqual({ turn: p2, over: false });
    expect(stageOf(s, 1)).toBe('flying');
  });
});

describe('morris: protected pieces', () => {
  // p1 just closed 0-1-2. p2 holds the mill 3-4-5 plus a loose piece on 9.
  it('cannot take a piece in a mill while others are free', () => {
    const s = position('000 111 ... 1..... ... ... ...', { removing: true });
    expect(removable(s)).toEqual([9]);
    expect(morris.apply(s, remove(4), p1)).toEqual({ error: 'protected' });
    expect(run(s, [remove(9)]).board[9]).toBeNull();
  });

  it('can take from a mill when every piece is in one, and wins below three', () => {
    const s = position('000 111 ... ...... ... ... ...', { removing: true });
    expect(removable(s)).toEqual([3, 4, 5]);
    const end = run(s, [remove(4)]);
    expect(morris.status(end)).toEqual({ winner: [p1], over: true });
    expect(morris.apply(end, move(3, 4), p2)).toEqual({ error: 'game-over' });
    expect(morris.legalMoves!(end, p2)).toEqual([]);
  });
});

describe('morris: no legal move', () => {
  it('wins when the opponent is fully blocked', () => {
    // p2 on 0 1 3 9, boxed in by p1 on 2 4 10 21. p1 makes a free move with 23.
    const s = position('110 10. ... 10.... ... ... 0.0');
    const end = run(s, [move(23, 22)]);
    expect(morris.status(end)).toEqual({ winner: [p1], over: true });
  });
});

describe('morris: draw by agreement', () => {
  it('opens after 50 moves without a capture', () => {
    expect(drawAvailable(position(MOVING, { quiet: QUIET_LIMIT - 1 }))).toBe(false);
    expect(drawAvailable(position(MOVING, { quiet: QUIET_LIMIT }))).toBe(true);
    expect(morris.apply(position(MOVING), { type: 'offerDraw' }, p1)).toEqual({
      error: 'no-draw',
    });
  });

  it('opens after the same position comes round three times', () => {
    const cycle = [move(0, 1), move(4, 5), move(1, 0), move(5, 4)];
    let s = position(MOVING);
    s = run(s, [...cycle, ...cycle]);
    expect(drawAvailable(s)).toBe(false);
    s = run(s, cycle);
    expect(drawAvailable(s)).toBe(true);
  });

  it('needs the other player to accept', () => {
    const s = position(MOVING, { quiet: QUIET_LIMIT });
    expect(morris.apply(s, { type: 'offerDraw' }, p2)).toEqual({ error: 'not-your-turn' });
    expect(morris.apply(s, { type: 'acceptDraw' }, p2)).toEqual({ error: 'no-offer' });

    const offered = run(s, [{ type: 'offerDraw' }]);
    expect(offered.drawOffer).toBe(0);
    expect(morris.status(offered)).toEqual({ turn: p2, over: false });
    expect(morris.legalMoves!(offered, p1)).toEqual([]);
    expect(morris.apply(offered, move(0, 1), p1)).toEqual({ error: 'draw-pending' });
    expect(morris.apply(offered, { type: 'acceptDraw' }, p1)).toEqual({ error: 'not-your-turn' });

    const declined = run(offered, [{ type: 'declineDraw' }]);
    expect(declined.drawOffer).toBeNull();
    expect(morris.status(declined)).toEqual({ turn: p1, over: false });

    const agreed = run(offered, [{ type: 'acceptDraw' }]);
    expect(morris.status(agreed)).toEqual({ draw: true, over: true });
  });
});

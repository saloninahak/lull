import { describe, expect, it } from 'vitest';
import {
  boxCount,
  boxEdges,
  boxesOfEdge,
  dangerBoxes,
  dots,
  edgeAt,
  edgeCount,
  hEdge,
  vEdge,
  type DotsState,
} from '../src';
import { freeze, ok, players } from './helpers';

const ids = players(4).map((p) => p.id) as [string, string, string, string];
const [a, b, c] = ids;

/** draw edges in order; the right player is whoever's turn it is */
function draw(s: DotsState, edges: number[]): DotsState {
  return edges.reduce((st, edge) => ok(dots.apply(st, { edge }, st.players[st.turn]!)), s);
}

describe('squares: geometry', () => {
  it('counts edges and boxes for every size', () => {
    expect([4, 5, 6].map(edgeCount)).toEqual([24, 40, 60]);
    expect([4, 5, 6].map(boxCount)).toEqual([9, 16, 25]);
  });

  it('round-trips edge ids', () => {
    for (const size of [4, 5, 6]) {
      for (let e = 0; e < edgeCount(size); e++) {
        const { kind, row, col } = edgeAt(size, e);
        expect(kind === 'h' ? hEdge(size, row, col) : vEdge(size, row, col)).toBe(e);
      }
    }
  });

  it('agrees on which boxes an edge touches', () => {
    for (const size of [4, 5, 6]) {
      for (let box = 0; box < boxCount(size); box++) {
        for (const e of boxEdges(size, box)) expect(boxesOfEdge(size, e)).toContain(box);
      }
      for (let e = 0; e < edgeCount(size); e++) {
        const n = boxesOfEdge(size, e).length;
        expect(n === 1 || n === 2).toBe(true);
      }
    }
  });
});

describe('squares: setup', () => {
  it('defaults to 5x5 dots with the first player to move', () => {
    const s = dots.init(players(2));
    expect(s.size).toBe(5);
    expect(s.edges).toHaveLength(40);
    expect(s.boxes).toHaveLength(16);
    expect(dots.status(s)).toEqual({ turn: a, over: false });
  });

  it('takes 2 to 4 players and sizes 4, 5, 6 only', () => {
    expect(() => dots.init(players(1))).toThrow();
    expect(() => dots.init(players(5))).toThrow();
    expect(dots.init(players(4), { size: 6 }).boxes).toHaveLength(25);
    // @ts-expect-error size 3 is not allowed
    expect(() => dots.init(players(2), { size: 3 })).toThrow();
  });
});

describe('squares: play', () => {
  it('passes the turn when no box closes', () => {
    const s = draw(dots.init(players(3), { size: 4 }), [0]);
    expect(s.edges[0]).toBe(0);
    expect(s.last).toEqual({ edge: 0, claimed: [] });
    expect(dots.status(s).turn).toBe(b);
  });

  it('rotates through all players', () => {
    const s = draw(dots.init(players(3), { size: 4 }), [0, 1, 2]);
    expect(dots.status(s).turn).toBe(a);
    const s4 = draw(dots.init(players(4), { size: 4 }), [0, 1, 2, 3]);
    expect(dots.status(s4).turn).toBe(a);
  });

  it('claims a box on the fourth side and gives another turn', () => {
    const size = 4;
    const [top, bottom, left, right] = boxEdges(size, 0);
    let s = draw(dots.init(players(2), { size }), [top, bottom, left]);
    expect(dots.status(s).turn).toBe(b);
    expect(dangerBoxes(s)).toEqual([0]);
    s = draw(s, [right]);
    expect(s.boxes[0]).toBe(1);
    expect(s.scores).toEqual([0, 1]);
    expect(s.last).toEqual({ edge: right, claimed: [0] });
    expect(dots.status(s).turn).toBe(b);
    expect(dangerBoxes(s)).toEqual([]);
  });

  it('can close two boxes with one line', () => {
    const size = 4;
    // boxes 0 and 1 share the vertical edge between them
    const shared = vEdge(size, 0, 1);
    const around = [...boxEdges(size, 0), ...boxEdges(size, 1)].filter((e) => e !== shared);
    let s = draw(dots.init(players(2), { size }), [...new Set(around)]);
    const mover = s.turn;
    s = draw(s, [shared]);
    expect(s.boxes[0]).toBe(mover);
    expect(s.boxes[1]).toBe(mover);
    expect(s.scores[mover]).toBe(2);
    expect(s.last?.claimed).toEqual([0, 1]);
  });

  it('rejects quietly with a reason', () => {
    const s = draw(dots.init(players(2), { size: 4 }), [0]);
    expect(dots.apply(s, { edge: 0 }, b)).toEqual({ error: 'taken' });
    expect(dots.apply(s, { edge: 1 }, a)).toEqual({ error: 'not-your-turn' });
    expect(dots.apply(s, { edge: 24 }, b)).toEqual({ error: 'out-of-range' });
    expect(dots.apply(s, { edge: 0.5 }, b)).toEqual({ error: 'out-of-range' });
    expect(dots.apply(s, { edge: 1 }, 'stranger')).toEqual({ error: 'not-a-player' });
  });

  it('never mutates the state it was given', () => {
    const s = freeze(draw(dots.init(players(2), { size: 4 }), [0, 1]));
    const next = ok(dots.apply(s, { edge: 2 }, a));
    expect(s.edges[2]).toBeNull();
    expect(next.edges[2]).toBe(0);
  });

  it('lists open edges for the player to move only', () => {
    const s = draw(dots.init(players(2), { size: 4 }), [0]);
    expect(dots.legalMoves!(s, b)).toHaveLength(23);
    expect(dots.legalMoves!(s, a)).toEqual([]);
  });
});

describe('squares: endings', () => {
  /** fill the board, letting whoever is up draw the lowest open edge */
  function fill(s: DotsState): DotsState {
    let st = s;
    while (!dots.status(st).over) st = draw(st, [st.edges.indexOf(null)]);
    return st;
  }

  it('ends when every box is claimed and names the leader', () => {
    const s = fill(dots.init(players(2), { size: 4 }));
    expect(s.boxes.every((x) => x !== null)).toBe(true);
    expect(s.scores.reduce((x, y) => x + y)).toBe(9);
    const st = dots.status(s);
    expect(st.over).toBe(true);
    const top = Math.max(...s.scores);
    expect(st.winner).toEqual(s.players.filter((_, i) => s.scores[i] === top));
    expect(dots.apply(s, { edge: 0 }, a)).toEqual({ error: 'game-over' });
  });

  it('calls everyone level a draw, and a shared top a shared win', () => {
    const base = dots.init(players(3), { size: 4 });
    const full = { ...base, boxes: base.boxes.map(() => 0), edges: base.edges.map(() => 0) };
    expect(dots.status({ ...full, scores: [3, 3, 3] })).toEqual({ draw: true, over: true });
    expect(dots.status({ ...full, scores: [4, 4, 1] })).toEqual({ winner: [a, b], over: true });
    expect(dots.status({ ...full, scores: [1, 2, 6] })).toEqual({ winner: [c], over: true });
  });
});

import { describe, expect, it } from 'vitest';
import {
  closesTriangle,
  createRoom,
  isError,
  nextInt,
  reduceRoom,
  roomView,
  sim,
  SIM_EDGES,
  simEdge,
  type Room,
  type RoomAction,
  type SimState,
} from '../src';
import { freeze, ok, players } from './helpers';

const [a, b] = players(2).map((p) => p.id) as [string, string];
const start = () => sim.init(players(2));

/** draw lines in turn, each given by its two points */
const draw = (s: SimState, ...lines: Array<[number, number]>) =>
  lines.reduce((st, [x, y]) => {
    const by = st.players[st.turn];
    return ok(sim.apply(st, { edge: simEdge(x, y) }, by));
  }, s);

describe('sim', () => {
  it('has six points and fifteen lines', () => {
    expect(SIM_EDGES).toHaveLength(15);
    expect(simEdge(2, 0)).toBe(simEdge(0, 2));
    expect(simEdge(3, 3)).toBe(-1);
    const s = start();
    expect(sim.legalMoves!(s, a)).toHaveLength(15);
    expect(sim.legalMoves!(s, b)).toHaveLength(0);
    expect(sim.status(s)).toEqual({ turn: a, over: false });
  });

  it('takes turns, and refuses taken lines and moves out of turn', () => {
    const s = freeze(draw(start(), [0, 1]));
    expect(s.edges[simEdge(0, 1)]).toBe(0);
    expect(s.turn).toBe(1);
    expect(sim.apply(s, { edge: simEdge(0, 1) }, b)).toEqual({ error: 'taken' });
    expect(sim.apply(s, { edge: simEdge(2, 3) }, a)).toEqual({ error: 'not-your-turn' });
    expect(sim.apply(s, { edge: 15 }, b)).toEqual({ error: 'out-of-range' });
    expect(sim.apply(s, { edge: 1.5 }, b)).toEqual({ error: 'out-of-range' });
    expect(sim.apply(s, { edge: 0 }, 'nobody')).toEqual({ error: 'not-a-player' });
  });

  it('a triangle in your own color loses', () => {
    let s = draw(start(), [0, 1], [3, 4], [1, 2], [4, 5]);
    // drawing 0-2 would close a's triangle: the board can say so before it happens
    expect(closesTriangle(s.edges, simEdge(0, 2), 0)).toEqual([0, 1, 2]);
    expect(closesTriangle(s.edges, simEdge(0, 2), 1)).toBeNull();
    s = draw(s, [0, 2]);
    expect(s.loser).toBe(0);
    expect(s.triangle).toEqual([0, 1, 2]);
    expect(sim.status(s)).toEqual({ winner: [b], over: true });
    expect(sim.apply(s, { edge: simEdge(3, 5) }, b)).toEqual({ error: 'game-over' });
  });

  it("the other color's lines don't make your triangle", () => {
    // a has 0-1 and 1-2, b has 0-2: no triangle for anyone
    const s = draw(start(), [0, 1], [0, 2], [1, 2]);
    expect(s.loser).toBeNull();
  });

  it('never ends in a draw: random games always find a loser by the fifteenth line', () => {
    for (let seed = 1; seed <= 400; seed++) {
      let s = start();
      let rng = seed;
      while (!sim.status(s).over) {
        const by = s.players[s.turn];
        const moves = sim.legalMoves!(s, by);
        expect(moves.length).toBeGreaterThan(0);
        const [i, next] = nextInt(rng, moves.length);
        rng = next;
        const result = sim.apply(s, moves[i]!, by);
        if (isError(result)) throw new Error(result.error);
        s = result;
      }
      expect(s.moves).toBeLessThanOrEqual(15);
      expect(s.moves).toBeGreaterThanOrEqual(5);
      expect(s.loser).not.toBeNull();
      // the triangle really is the loser's own color
      const [x, y, z] = s.triangle!;
      for (const [p, q] of [
        [x, y],
        [y, z],
        [x, z],
      ] as const) {
        expect(s.edges[simEdge(p, q)]).toBe(s.loser);
      }
    }
  });

  it('can take a move back in a room, like the other turn games', () => {
    const run = (r: Room, actions: RoomAction[]) =>
      actions.reduce((x, act) => {
        const n = reduceRoom(x, act);
        if (isError(n)) throw new Error(n.error);
        return n;
      }, r);
    const r = run(createRoom('QBXT', 'sim'), [
      { type: 'join', id: 'ana-00000001', name: 'ana', now: 0 },
      { type: 'join', id: 'ben-00000002', name: 'ben', now: 0 },
      { type: 'start', by: 'ana-00000001', seed: 1, now: 0 },
      { type: 'move', by: 'ana-00000001', now: 0, move: { edge: 0 } },
    ]);
    expect(roomView(r, 'ana-00000001').match!.canTakeBack).toBe(true);
    const back = run(r, [
      { type: 'takeback', by: 'ana-00000001' },
      { type: 'answer', by: 'ben-00000002', accept: true },
    ]);
    expect((back.match!.state as SimState).edges.every((e) => e === null)).toBe(true);
  });
});

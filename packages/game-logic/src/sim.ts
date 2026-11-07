import { checkPlayers, type Game, type MoveResult, type Player, type Status } from './types.ts';

/**
 * sim (readme 7.14). six points, and the fifteen lines between them. two
 * players take turns drawing one line in their own color. whoever first
 * makes a triangle of their own color, with its corners on three of the
 * six points, loses. there are no draws: with six points, the last line
 * always closes someone's triangle. players[0] goes first.
 */

export const SIM_POINTS = 6;
export type SimSeat = 0 | 1;

/** every pair of points, a before b, in a fixed order */
export const SIM_EDGES: ReadonlyArray<readonly [number, number]> = (() => {
  const out: Array<readonly [number, number]> = [];
  for (let a = 0; a < SIM_POINTS; a++) for (let b = a + 1; b < SIM_POINTS; b++) out.push([a, b]);
  return out;
})();

/** the line between two points, either way round, or -1 */
export function simEdge(a: number, b: number): number {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return SIM_EDGES.findIndex(([x, y]) => x === lo && y === hi);
}

export type SimState = {
  players: [string, string];
  /** who drew each line, by seat */
  edges: Array<SimSeat | null>;
  turn: SimSeat;
  moves: number;
  /** whoever closed a triangle */
  loser: SimSeat | null;
  /** its three corners */
  triangle: [number, number, number] | null;
  /** the line drawn last */
  last: number | null;
};

export type SimMove = { edge: number };
export type SimError = 'game-over' | 'not-a-player' | 'not-your-turn' | 'out-of-range' | 'taken';

/**
 * the triangle this line would close for `seat`, if drawing it would.
 * used to end the game, and on screen to warn before a losing line.
 */
export function closesTriangle(
  edges: ReadonlyArray<SimSeat | null>,
  edge: number,
  seat: SimSeat,
): [number, number, number] | null {
  const pair = SIM_EDGES[edge];
  if (!pair) return null;
  const [a, b] = pair;
  for (let c = 0; c < SIM_POINTS; c++) {
    if (c === a || c === b) continue;
    if (edges[simEdge(a, c)] === seat && edges[simEdge(b, c)] === seat) {
      return [a, b, c].sort((x, y) => x - y) as [number, number, number];
    }
  }
  return null;
}

const seatOf = (s: SimState, id: string): SimSeat | null =>
  s.players[0] === id ? 0 : s.players[1] === id ? 1 : null;

export const sim: Game<SimState, SimMove, undefined, SimError> = {
  id: 'sim',
  minPlayers: 2,
  maxPlayers: 2,

  init(players: Player[]): SimState {
    checkPlayers(players, 2, 2);
    return {
      players: [players[0]!.id, players[1]!.id],
      edges: Array<SimSeat | null>(SIM_EDGES.length).fill(null),
      turn: 0,
      moves: 0,
      loser: null,
      triangle: null,
      last: null,
    };
  },

  legalMoves(state, id) {
    if (state.loser !== null || seatOf(state, id) !== state.turn) return [];
    return state.edges.flatMap((e, edge) => (e === null ? [{ edge }] : []));
  },

  apply(state, move, id): MoveResult<SimState, SimError> {
    if (state.loser !== null) return { error: 'game-over' };
    const seat = seatOf(state, id);
    if (seat === null) return { error: 'not-a-player' };
    if (seat !== state.turn) return { error: 'not-your-turn' };
    const edge = move?.edge;
    if (!Number.isInteger(edge) || edge < 0 || edge >= SIM_EDGES.length) {
      return { error: 'out-of-range' };
    }
    if (state.edges[edge] !== null) return { error: 'taken' };

    const triangle = closesTriangle(state.edges, edge, seat);
    const edges = state.edges.slice();
    edges[edge] = seat;
    return {
      ...state,
      edges,
      moves: state.moves + 1,
      last: edge,
      turn: seat === 0 ? 1 : 0,
      loser: triangle ? seat : null,
      triangle,
    };
  },

  status(state): Status {
    if (state.loser !== null) {
      return { winner: [state.players[state.loser === 0 ? 1 : 0]], over: true };
    }
    return { turn: state.players[state.turn], over: false };
  },
};

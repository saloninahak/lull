import { checkPlayers, type Game, type MoveResult, type Player, type Status } from './types.ts';

/**
 * squares, the dots-and-lines game (readme 7.2). the code keeps the id `dots`.
 * a grid of `size` x `size` dots. players take turns drawing one line
 * between two neighbouring dots. closing the fourth side of a box claims
 * it and gives another turn. most boxes wins; ties are allowed.
 *
 * edges are numbered: all horizontal edges first (row by row), then all
 * vertical edges. use hEdge / vEdge / edgeAt to move between the two views.
 */

export type DotsSize = 4 | 5 | 6;
export type DotsOptions = { size?: DotsSize };

export type DotsState = {
  size: DotsSize;
  players: string[];
  /** who drew each edge (seat index), or null */
  edges: Array<number | null>;
  /** who claimed each box (seat index), or null. row-major, (size-1)^2 boxes */
  boxes: Array<number | null>;
  /** seat index whose turn it is */
  turn: number;
  scores: number[];
  /** the edge just drawn and any boxes it closed, for the line and fill animations */
  last: { edge: number; claimed: number[] } | null;
};

export type DotsMove = { edge: number };

export type DotsError = 'game-over' | 'not-a-player' | 'not-your-turn' | 'out-of-range' | 'taken';

export type EdgeInfo = { kind: 'h' | 'v'; row: number; col: number };

export const DOTS_SIZES: readonly DotsSize[] = [4, 5, 6];
export const DEFAULT_DOTS_SIZE: DotsSize = 5;

/* geometry ---------------------------------------------------------------- */

/** number of horizontal edges: size rows of size-1 */
export const hCount = (size: number) => size * (size - 1);
export const edgeCount = (size: number) => 2 * size * (size - 1);
export const boxCount = (size: number) => (size - 1) * (size - 1);

/** the horizontal edge from dot (row, col) to (row, col+1) */
export function hEdge(size: number, row: number, col: number): number {
  return row * (size - 1) + col;
}

/** the vertical edge from dot (row, col) to (row+1, col) */
export function vEdge(size: number, row: number, col: number): number {
  return hCount(size) + row * size + col;
}

export function edgeAt(size: number, edge: number): EdgeInfo {
  const h = hCount(size);
  if (edge < h) return { kind: 'h', row: Math.floor(edge / (size - 1)), col: edge % (size - 1) };
  const i = edge - h;
  return { kind: 'v', row: Math.floor(i / size), col: i % size };
}

/** the four edges of box (row, col): top, bottom, left, right */
export function boxEdges(size: number, box: number): [number, number, number, number] {
  const row = Math.floor(box / (size - 1));
  const col = box % (size - 1);
  return [
    hEdge(size, row, col),
    hEdge(size, row + 1, col),
    vEdge(size, row, col),
    vEdge(size, row, col + 1),
  ];
}

/** the one or two boxes an edge borders */
export function boxesOfEdge(size: number, edge: number): number[] {
  const { kind, row, col } = edgeAt(size, edge);
  const n = size - 1;
  const out: number[] = [];
  if (kind === 'h') {
    if (row > 0) out.push((row - 1) * n + col);
    if (row < n) out.push(row * n + col);
  } else {
    if (col > 0) out.push(row * n + (col - 1));
    if (col < n) out.push(row * n + col);
  }
  return out;
}

/* selectors --------------------------------------------------------------- */

export function sidesDrawn(state: DotsState, box: number): number {
  return boxEdges(state.size, box).filter((e) => state.edges[e] !== null).length;
}

/** unclaimed boxes with three sides drawn. the ui gives them a barely-there tint. */
export function dangerBoxes(state: DotsState): number[] {
  const out: number[] = [];
  for (let b = 0; b < state.boxes.length; b++) {
    if (state.boxes[b] === null && sidesDrawn(state, b) === 3) out.push(b);
  }
  return out;
}

const isOver = (state: DotsState) => state.boxes.every((b) => b !== null);

/* game ---------------------------------------------------------------------- */

export const dots: Game<DotsState, DotsMove, DotsOptions, DotsError> = {
  id: 'dots',
  minPlayers: 2,
  maxPlayers: 4,

  init(players: Player[], options?: DotsOptions): DotsState {
    checkPlayers(players, 2, 4);
    const size = options?.size ?? DEFAULT_DOTS_SIZE;
    if (!DOTS_SIZES.includes(size)) throw new Error(`dots size must be 4, 5 or 6, got ${size}`);
    return {
      size,
      players: players.map((p) => p.id),
      edges: Array<number | null>(edgeCount(size)).fill(null),
      boxes: Array<number | null>(boxCount(size)).fill(null),
      turn: 0,
      scores: players.map(() => 0),
      last: null,
    };
  },

  legalMoves(state, playerId) {
    if (isOver(state) || state.players[state.turn] !== playerId) return [];
    const moves: DotsMove[] = [];
    state.edges.forEach((owner, edge) => {
      if (owner === null) moves.push({ edge });
    });
    return moves;
  },

  apply(state, move, playerId): MoveResult<DotsState, DotsError> {
    if (isOver(state)) return { error: 'game-over' };
    const seat = state.players.indexOf(playerId);
    if (seat < 0) return { error: 'not-a-player' };
    if (seat !== state.turn) return { error: 'not-your-turn' };
    const { edge } = move;
    if (!Number.isInteger(edge) || edge < 0 || edge >= state.edges.length) {
      return { error: 'out-of-range' };
    }
    if (state.edges[edge] !== null) return { error: 'taken' };

    const edges = state.edges.slice();
    edges[edge] = seat;

    const boxes = state.boxes.slice();
    const claimed: number[] = [];
    for (const b of boxesOfEdge(state.size, edge)) {
      if (boxes[b] === null && boxEdges(state.size, b).every((e) => edges[e] !== null)) {
        boxes[b] = seat;
        claimed.push(b);
      }
    }

    const scores = state.scores.slice();
    scores[seat] = (scores[seat] ?? 0) + claimed.length;

    return {
      ...state,
      edges,
      boxes,
      scores,
      // closing a box earns another turn
      turn: claimed.length > 0 ? seat : (seat + 1) % state.players.length,
      last: { edge, claimed },
    };
  },

  status(state): Status {
    if (!isOver(state)) return { turn: state.players[state.turn], over: false };
    const top = Math.max(...state.scores);
    const leaders = state.players.filter((_, i) => state.scores[i] === top);
    // everyone level is a draw; a shared top among some is a shared win
    if (leaders.length === state.players.length) return { draw: true, over: true };
    return { winner: leaders, over: true };
  },
};

import { checkPlayers, type Game, type MoveResult, type Player, type Status } from './types.ts';

/**
 * nine men's morris (readme 7.4).
 *
 * board points, numbered left to right, top to bottom:
 *
 *   0-----------1-----------2
 *   |           |           |
 *   |   3-------4-------5   |
 *   |   |       |       |   |
 *   |   |   6---7---8   |   |
 *   |   |   |       |   |   |
 *   9---10--11      12--13--14
 *   |   |   |       |   |   |
 *   |   |   15--16--17  |   |
 *   |   |       |       |   |
 *   |   18------19------20  |
 *   |           |           |
 *   21----------22----------23
 *
 * each player has nine pieces. placing, then moving along lines, then
 * flying once a player is down to three. a mill (three in a line) removes
 * one opponent piece that is not in a mill, unless all of them are.
 * you win when the opponent has fewer than three pieces or cannot move.
 * threefold repetition or 50 moves without a capture make a draw available,
 * which needs both players to agree.
 */

export type Seat = 0 | 1;
export type Stage = 'placing' | 'moving' | 'flying';

export type MorrisMove =
  | { type: 'place'; to: number }
  | { type: 'move'; from: number; to: number }
  | { type: 'remove'; at: number }
  | { type: 'offerDraw' }
  | { type: 'acceptDraw' }
  | { type: 'declineDraw' };

export type MorrisError =
  | 'game-over'
  | 'not-a-player'
  | 'not-your-turn'
  | 'out-of-range'
  | 'occupied'
  | 'must-place'
  | 'must-move'
  | 'must-remove'
  | 'not-removing'
  | 'not-your-piece'
  | 'not-adjacent'
  | 'empty'
  | 'own-piece'
  | 'protected'
  | 'no-draw'
  | 'no-offer'
  | 'draw-pending';

export type MorrisLast =
  | { kind: 'place'; seat: Seat; to: number; mills: number[][] }
  | { kind: 'move'; seat: Seat; from: number; to: number; mills: number[][] }
  | { kind: 'remove'; seat: Seat; at: number };

export type MorrisState = {
  players: [string, string];
  /** owner of each of the 24 points */
  board: Array<Seat | null>;
  /** pieces not yet placed */
  inHand: [number, number];
  /** pieces removed from each player */
  lost: [number, number];
  turn: Seat;
  /** the player to move formed a mill and must now remove a piece */
  removing: boolean;
  /** slides and flies since the last capture */
  quiet: number;
  /** how often each moving-stage position has been seen (board + side to move) */
  seen: Record<string, number>;
  /** a pending draw offer, by seat */
  drawOffer: Seat | null;
  winner: Seat | null;
  draw: boolean;
  last: MorrisLast | null;
};

export const PIECES = 9;
export const QUIET_LIMIT = 50;
export const REPEAT_LIMIT = 3;

/** point positions on a 7x7 grid, [x, y], for drawing the board */
// prettier-ignore
export const POINTS: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [3, 0], [6, 0],
  [1, 1], [3, 1], [5, 1],
  [2, 2], [3, 2], [4, 2],
  [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3],
  [2, 4], [3, 4], [4, 4],
  [1, 5], [3, 5], [5, 5],
  [0, 6], [3, 6], [6, 6],
];

// prettier-ignore
export const ADJACENT: ReadonlyArray<readonly number[]> = [
  [1, 9], [0, 2, 4], [1, 14],
  [4, 10], [1, 3, 5, 7], [4, 13],
  [7, 11], [4, 6, 8], [7, 12],
  [0, 10, 21], [3, 9, 11, 18], [6, 10, 15], [8, 13, 17], [5, 12, 14, 20], [2, 13, 23],
  [11, 16], [15, 17, 19], [12, 16],
  [10, 19], [16, 18, 20, 22], [13, 19],
  [9, 22], [19, 21, 23], [14, 22],
];

// prettier-ignore
export const MILLS: ReadonlyArray<readonly [number, number, number]> = [
  // across
  [0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11],
  [12, 13, 14], [15, 16, 17], [18, 19, 20], [21, 22, 23],
  // down
  [0, 9, 21], [3, 10, 18], [6, 11, 15], [1, 4, 7],
  [16, 19, 22], [8, 12, 17], [5, 13, 20], [2, 14, 23],
];

const other = (seat: Seat): Seat => (seat === 0 ? 1 : 0);
const inRange = (p: number) => Number.isInteger(p) && p >= 0 && p < 24;

/* selectors --------------------------------------------------------------- */

export function onBoard(state: MorrisState, seat: Seat): number {
  return state.board.filter((s) => s === seat).length;
}

export function counts(state: MorrisState, seat: Seat) {
  return { inHand: state.inHand[seat], onBoard: onBoard(state, seat), lost: state.lost[seat] };
}

export function stageOf(state: MorrisState, seat: Seat): Stage {
  if (state.inHand[seat] > 0) return 'placing';
  return onBoard(state, seat) === 3 ? 'flying' : 'moving';
}

/** mills through `point` that are fully owned by `seat` */
export function millsThrough(
  board: ReadonlyArray<Seat | null>,
  point: number,
  seat: Seat,
): number[][] {
  return MILLS.filter((m) => m.includes(point) && m.every((p) => board[p] === seat)).map((m) => [
    ...m,
  ]);
}

export function inMill(board: ReadonlyArray<Seat | null>, point: number): boolean {
  const seat = board[point];
  if (seat === null || seat === undefined) return false;
  return millsThrough(board, point, seat).length > 0;
}

/** where the piece on `from` may go right now (empty if it is not the mover's piece) */
export function destinations(state: MorrisState, from: number): number[] {
  const seat = state.board[from];
  if (seat !== state.turn || state.removing || stageOf(state, seat) === 'placing') return [];
  const targets = stageOf(state, seat) === 'flying' ? POINTS.map((_, i) => i) : ADJACENT[from]!;
  return targets.filter((p) => state.board[p] === null);
}

/** opponent pieces the mover may take while removing */
export function removable(state: MorrisState): number[] {
  if (!state.removing) return [];
  const opp = other(state.turn);
  const theirs = state.board.flatMap((s, p) => (s === opp ? [p] : []));
  const free = theirs.filter((p) => !inMill(state.board, p));
  return free.length > 0 ? free : theirs;
}

function hasAnyMove(state: MorrisState, seat: Seat): boolean {
  if (state.inHand[seat] > 0) return state.board.some((s) => s === null);
  const probe = { ...state, turn: seat, removing: false };
  return state.board.some((s, p) => s === seat && destinations(probe, p).length > 0);
}

const positionKey = (board: ReadonlyArray<Seat | null>, turn: Seat) =>
  `${board.map((s) => (s === null ? '.' : s)).join('')}:${turn}`;

const bothMoving = (state: MorrisState) => state.inHand[0] === 0 && state.inHand[1] === 0;

/** a draw may be offered: 50 quiet moves, or this position seen three times */
export function drawAvailable(state: MorrisState): boolean {
  if (state.winner !== null || state.draw || state.removing || !bothMoving(state)) return false;
  if (state.quiet >= QUIET_LIMIT) return true;
  return (state.seen[positionKey(state.board, state.turn)] ?? 0) >= REPEAT_LIMIT;
}

/* turn handling --------------------------------------------------------------- */

/** pass the turn, then check whether the next player has lost */
function endTurn(state: MorrisState): MorrisState {
  const mover = state.turn;
  const next = other(mover);
  const passed: MorrisState = { ...state, turn: next, removing: false };

  const remaining = passed.inHand[next] + onBoard(passed, next);
  if (remaining < 3 || !hasAnyMove(passed, next)) {
    return { ...passed, winner: mover, drawOffer: null };
  }

  if (bothMoving(passed)) {
    const key = positionKey(passed.board, next);
    return { ...passed, seen: { ...passed.seen, [key]: (passed.seen[key] ?? 0) + 1 } };
  }
  return passed;
}

/** after a place or move: remove if a mill formed (and there is something to take) */
function afterLanding(state: MorrisState, mills: number[][]): MorrisState {
  const opp = other(state.turn);
  if (mills.length > 0 && state.board.some((s) => s === opp)) {
    return { ...state, removing: true };
  }
  return endTurn(state);
}

/* game ---------------------------------------------------------------------- */

export const morris: Game<MorrisState, MorrisMove, undefined, MorrisError> = {
  id: 'morris',
  minPlayers: 2,
  maxPlayers: 2,

  init(players: Player[]): MorrisState {
    checkPlayers(players, 2, 2);
    return {
      players: [players[0]!.id, players[1]!.id],
      board: Array<Seat | null>(24).fill(null),
      inHand: [PIECES, PIECES],
      lost: [0, 0],
      turn: 0,
      removing: false,
      quiet: 0,
      seen: {},
      drawOffer: null,
      winner: null,
      draw: false,
      last: null,
    };
  },

  /** board moves only (place, move, remove). draw offers are separate. */
  legalMoves(state, playerId) {
    if (state.winner !== null || state.draw || state.drawOffer !== null) return [];
    if (state.players[state.turn] !== playerId) return [];
    if (state.removing) return removable(state).map((at) => ({ type: 'remove', at }) as const);
    if (state.inHand[state.turn] > 0) {
      return state.board.flatMap((s, to) => (s === null ? [{ type: 'place', to } as const] : []));
    }
    return state.board.flatMap((s, from) =>
      s === state.turn
        ? destinations(state, from).map((to) => ({ type: 'move', from, to }) as const)
        : [],
    );
  },

  apply(state, move, playerId): MoveResult<MorrisState, MorrisError> {
    if (state.winner !== null || state.draw) return { error: 'game-over' };
    const idx = state.players.indexOf(playerId);
    if (idx < 0) return { error: 'not-a-player' };
    const seat = idx as Seat;

    /* draw by agreement --------------------------------------------------- */
    if (state.drawOffer !== null) {
      if (move.type !== 'acceptDraw' && move.type !== 'declineDraw') {
        return { error: 'draw-pending' };
      }
      if (seat === state.drawOffer) return { error: 'not-your-turn' };
      return move.type === 'acceptDraw'
        ? { ...state, draw: true, drawOffer: null }
        : { ...state, drawOffer: null };
    }
    if (move.type === 'acceptDraw' || move.type === 'declineDraw') return { error: 'no-offer' };

    if (seat !== state.turn) return { error: 'not-your-turn' };

    if (move.type === 'offerDraw') {
      if (!drawAvailable(state)) return { error: 'no-draw' };
      return { ...state, drawOffer: seat };
    }

    /* removing after a mill ------------------------------------------------ */
    if (state.removing) {
      if (move.type !== 'remove') return { error: 'must-remove' };
      const { at } = move;
      if (!inRange(at)) return { error: 'out-of-range' };
      if (state.board[at] === null) return { error: 'empty' };
      if (state.board[at] === seat) return { error: 'own-piece' };
      if (!removable(state).includes(at)) return { error: 'protected' };

      const board = state.board.slice();
      board[at] = null;
      const lost: [number, number] = [...state.lost];
      lost[other(seat)] += 1;
      // a capture resets the quiet count and the repetition history
      return endTurn({
        ...state,
        board,
        lost,
        quiet: 0,
        seen: {},
        last: { kind: 'remove', seat, at },
      });
    }
    if (move.type === 'remove') return { error: 'not-removing' };

    /* placing --------------------------------------------------------------- */
    if (move.type === 'place') {
      if (state.inHand[seat] === 0) return { error: 'must-move' };
      const { to } = move;
      if (!inRange(to)) return { error: 'out-of-range' };
      if (state.board[to] !== null) return { error: 'occupied' };

      const board = state.board.slice();
      board[to] = seat;
      const inHand: [number, number] = [...state.inHand];
      inHand[seat] -= 1;
      const mills = millsThrough(board, to, seat);
      return afterLanding(
        { ...state, board, inHand, last: { kind: 'place', seat, to, mills } },
        mills,
      );
    }

    /* moving and flying ----------------------------------------------------- */
    if (state.inHand[seat] > 0) return { error: 'must-place' };
    const { from, to } = move;
    if (!inRange(from) || !inRange(to)) return { error: 'out-of-range' };
    if (state.board[from] !== seat) return { error: 'not-your-piece' };
    if (state.board[to] !== null) return { error: 'occupied' };
    if (stageOf(state, seat) !== 'flying' && !ADJACENT[from]!.includes(to)) {
      return { error: 'not-adjacent' };
    }

    const board = state.board.slice();
    board[from] = null;
    board[to] = seat;
    const mills = millsThrough(board, to, seat);
    return afterLanding(
      { ...state, board, quiet: state.quiet + 1, last: { kind: 'move', seat, from, to, mills } },
      mills,
    );
  },

  status(state): Status {
    if (state.winner !== null) return { winner: [state.players[state.winner]], over: true };
    if (state.draw) return { draw: true, over: true };
    // while a draw is offered, the other player is the one deciding
    const waitingOn = state.drawOffer !== null ? other(state.drawOffer) : state.turn;
    return { turn: state.players[waitingOn], over: false };
  },
};

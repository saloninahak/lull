import { checkPlayers, type Game, type MoveResult, type Player, type Status } from './types.ts';

/**
 * connect four (readme 7.5). a 7 wide, 6 tall frame. discs drop to the
 * lowest open spot in a column. four in a row in any direction wins.
 * players[0] goes first.
 */

export const C4_COLS = 7;
export const C4_ROWS = 6;
export type C4Seat = 0 | 1;

export type Connect4State = {
  players: [string, string];
  /** row-major, row 0 at the top */
  board: Array<C4Seat | null>;
  turn: C4Seat;
  moves: number;
  winner: C4Seat | null;
  winLine: number[] | null;
  draw: boolean;
  /** the cell the last disc landed in */
  last: number | null;
};

export type Connect4Move = { col: number };
export type Connect4Error =
  'game-over' | 'not-a-player' | 'not-your-turn' | 'out-of-range' | 'column-full';

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

/** the row a disc dropped in this column would land on, or -1 when it's full */
export function landingRow(board: ReadonlyArray<C4Seat | null>, col: number): number {
  for (let r = C4_ROWS - 1; r >= 0; r--) if (board[r * C4_COLS + col] === null) return r;
  return -1;
}

function runThrough(
  board: ReadonlyArray<C4Seat | null>,
  cell: number,
  [dr, dc]: readonly [number, number],
  seat: C4Seat,
): number[] {
  const at = (r: number, c: number) =>
    r >= 0 && r < C4_ROWS && c >= 0 && c < C4_COLS && board[r * C4_COLS + c] === seat;
  let r = Math.floor(cell / C4_COLS);
  let c = cell % C4_COLS;
  while (at(r - dr, c - dc)) {
    r -= dr;
    c -= dc;
  }
  const out: number[] = [];
  while (at(r, c)) {
    out.push(r * C4_COLS + c);
    r += dr;
    c += dc;
  }
  return out;
}

const seatOf = (s: Connect4State, id: string): C4Seat | null =>
  s.players[0] === id ? 0 : s.players[1] === id ? 1 : null;

export const connect4: Game<Connect4State, Connect4Move, undefined, Connect4Error> = {
  id: 'connect4',
  minPlayers: 2,
  maxPlayers: 2,

  init(players: Player[]): Connect4State {
    checkPlayers(players, 2, 2);
    return {
      players: [players[0]!.id, players[1]!.id],
      board: Array<C4Seat | null>(C4_COLS * C4_ROWS).fill(null),
      turn: 0,
      moves: 0,
      winner: null,
      winLine: null,
      draw: false,
      last: null,
    };
  },

  legalMoves(state, id) {
    if (state.winner !== null || state.draw || seatOf(state, id) !== state.turn) return [];
    const out: Connect4Move[] = [];
    for (let col = 0; col < C4_COLS; col++)
      if (landingRow(state.board, col) >= 0) out.push({ col });
    return out;
  },

  apply(state, move, id): MoveResult<Connect4State, Connect4Error> {
    if (state.winner !== null || state.draw) return { error: 'game-over' };
    const seat = seatOf(state, id);
    if (seat === null) return { error: 'not-a-player' };
    if (seat !== state.turn) return { error: 'not-your-turn' };
    const col = move?.col;
    if (!Number.isInteger(col) || col < 0 || col >= C4_COLS) return { error: 'out-of-range' };
    const row = landingRow(state.board, col);
    if (row < 0) return { error: 'column-full' };

    const cell = row * C4_COLS + col;
    const board = state.board.slice();
    board[cell] = seat;
    let winLine: number[] | null = null;
    for (const dir of DIRS) {
      const run = runThrough(board, cell, dir, seat);
      if (run.length >= 4) {
        winLine = run;
        break;
      }
    }
    const moves = state.moves + 1;
    return {
      ...state,
      board,
      moves,
      last: cell,
      turn: seat === 0 ? 1 : 0,
      winner: winLine ? seat : null,
      winLine,
      draw: !winLine && moves === board.length,
    };
  },

  status(state): Status {
    if (state.winner !== null) return { winner: [state.players[state.winner]], over: true };
    if (state.draw) return { draw: true, over: true };
    return { turn: state.players[state.turn], over: false };
  },
};

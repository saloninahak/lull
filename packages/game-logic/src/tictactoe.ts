import { checkPlayers, type Game, type MoveResult, type Player, type Status } from './types.ts';

/**
 * tic tac toe (readme 7.1).
 * classic: 3x3, three in a row. variant: 5x5, four in a row. x goes first.
 * players[0] is x, players[1] is o.
 */

export type Mark = 'x' | 'o';
export type TicTacToeVariant = 'classic' | 'five';
export type TicTacToeOptions = { variant?: TicTacToeVariant };

export type TicTacToeState = {
  size: 3 | 5;
  winLength: 3 | 4;
  /** [x, o] */
  players: [string, string];
  /** row-major cells */
  board: Array<Mark | null>;
  turn: Mark;
  moves: number;
  winner: Mark | null;
  /** the full run of cells that won, in order, for the win-line stroke */
  winLine: number[] | null;
  draw: boolean;
  /** the last cell played, for the draw-in animation */
  last: number | null;
};

export type TicTacToeMove = { cell: number };

export type TicTacToeError =
  'game-over' | 'not-a-player' | 'not-your-turn' | 'out-of-range' | 'occupied';

const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], // across
  [1, 0], // down
  [1, 1], // diagonal
  [1, -1], // anti-diagonal
];

function markOf(state: TicTacToeState, playerId: string): Mark | null {
  if (state.players[0] === playerId) return 'x';
  if (state.players[1] === playerId) return 'o';
  return null;
}

/** the contiguous run of `mark` through `cell` along one direction, in order */
function runThrough(
  board: ReadonlyArray<Mark | null>,
  size: number,
  cell: number,
  [dr, dc]: readonly [number, number],
  mark: Mark,
): number[] {
  const row = Math.floor(cell / size);
  const col = cell % size;
  const at = (r: number, c: number) =>
    r >= 0 && r < size && c >= 0 && c < size && board[r * size + c] === mark;

  let r = row;
  let c = col;
  while (at(r - dr, c - dc)) {
    r -= dr;
    c -= dc;
  }
  const run: number[] = [];
  while (at(r, c)) {
    run.push(r * size + c);
    r += dr;
    c += dc;
  }
  return run;
}

export const tictactoe: Game<TicTacToeState, TicTacToeMove, TicTacToeOptions, TicTacToeError> = {
  id: 'tictactoe',
  minPlayers: 2,
  maxPlayers: 2,

  init(players: Player[], options?: TicTacToeOptions): TicTacToeState {
    checkPlayers(players, 2, 2);
    const five = options?.variant === 'five';
    const size = five ? 5 : 3;
    return {
      size,
      winLength: five ? 4 : 3,
      players: [players[0]!.id, players[1]!.id],
      board: Array<Mark | null>(size * size).fill(null),
      turn: 'x',
      moves: 0,
      winner: null,
      winLine: null,
      draw: false,
      last: null,
    };
  },

  legalMoves(state, playerId) {
    if (state.winner || state.draw || markOf(state, playerId) !== state.turn) return [];
    const moves: TicTacToeMove[] = [];
    state.board.forEach((m, cell) => {
      if (m === null) moves.push({ cell });
    });
    return moves;
  },

  apply(state, move, playerId): MoveResult<TicTacToeState, TicTacToeError> {
    if (state.winner || state.draw) return { error: 'game-over' };
    const mark = markOf(state, playerId);
    if (!mark) return { error: 'not-a-player' };
    if (mark !== state.turn) return { error: 'not-your-turn' };
    const { cell } = move;
    if (!Number.isInteger(cell) || cell < 0 || cell >= state.board.length) {
      return { error: 'out-of-range' };
    }
    if (state.board[cell] !== null) return { error: 'occupied' };

    const board = state.board.slice();
    board[cell] = mark;
    const moves = state.moves + 1;

    let winLine: number[] | null = null;
    for (const dir of DIRECTIONS) {
      const run = runThrough(board, state.size, cell, dir, mark);
      if (run.length >= state.winLength) {
        winLine = run;
        break;
      }
    }

    return {
      ...state,
      board,
      moves,
      last: cell,
      turn: mark === 'x' ? 'o' : 'x',
      winner: winLine ? mark : null,
      winLine,
      draw: !winLine && moves === board.length,
    };
  },

  status(state): Status {
    if (state.winner) {
      const id = state.players[state.winner === 'x' ? 0 : 1];
      return { winner: [id], over: true };
    }
    if (state.draw) return { draw: true, over: true };
    return { turn: state.players[state.turn === 'x' ? 0 : 1], over: false };
  },
};

import { describe, expect, it } from 'vitest';
import { tictactoe, type TicTacToeState } from '../src';
import { freeze, ok, players } from './helpers';

const [x, o] = players(2).map((p) => p.id) as [string, string];

/** play cells in order, alternating x and o */
function play(cells: number[], variant: 'classic' | 'five' = 'classic'): TicTacToeState {
  let s = tictactoe.init(players(2), { variant });
  cells.forEach((cell, i) => {
    s = ok(tictactoe.apply(s, { cell }, i % 2 === 0 ? x : o));
  });
  return s;
}

describe('tic tac toe: setup', () => {
  it('starts empty with x to move', () => {
    const s = tictactoe.init(players(2));
    expect(s.size).toBe(3);
    expect(s.winLength).toBe(3);
    expect(s.board.every((c) => c === null)).toBe(true);
    expect(tictactoe.status(s)).toEqual({ turn: x, over: false });
  });

  it('offers a 5x5 variant with four in a row', () => {
    const s = tictactoe.init(players(2), { variant: 'five' });
    expect(s.size).toBe(5);
    expect(s.winLength).toBe(4);
    expect(s.board).toHaveLength(25);
  });
});

describe('tic tac toe: moves', () => {
  it('alternates turns', () => {
    const s = play([4]);
    expect(s.board[4]).toBe('x');
    expect(s.last).toBe(4);
    expect(tictactoe.status(s).turn).toBe(o);
  });

  it('rejects quietly with a reason', () => {
    const s = play([4]);
    expect(tictactoe.apply(s, { cell: 0 }, x)).toEqual({ error: 'not-your-turn' });
    expect(tictactoe.apply(s, { cell: 4 }, o)).toEqual({ error: 'occupied' });
    expect(tictactoe.apply(s, { cell: 9 }, o)).toEqual({ error: 'out-of-range' });
    expect(tictactoe.apply(s, { cell: -1 }, o)).toEqual({ error: 'out-of-range' });
    expect(tictactoe.apply(s, { cell: 1.5 }, o)).toEqual({ error: 'out-of-range' });
    expect(tictactoe.apply(s, { cell: 0 }, 'stranger')).toEqual({ error: 'not-a-player' });
  });

  it('never mutates the state it was given', () => {
    const s = freeze(play([0, 4]));
    const next = ok(tictactoe.apply(s, { cell: 8 }, x));
    expect(s.board[8]).toBeNull();
    expect(next.board[8]).toBe('x');
  });

  it('lists empty cells for the player to move only', () => {
    const s = play([0, 4]);
    expect(tictactoe.legalMoves!(s, x).map((m) => m.cell)).toEqual([1, 2, 3, 5, 6, 7, 8]);
    expect(tictactoe.legalMoves!(s, o)).toEqual([]);
  });
});

describe('tic tac toe: endings', () => {
  it('wins on a row, with the line', () => {
    const s = play([0, 3, 1, 4, 2]);
    expect(tictactoe.status(s)).toEqual({ winner: [x], over: true });
    expect(s.winLine).toEqual([0, 1, 2]);
  });

  it('wins on a column and both diagonals', () => {
    expect(play([1, 0, 4, 2, 7]).winLine).toEqual([1, 4, 7]);
    expect(play([0, 1, 4, 2, 8]).winLine).toEqual([0, 4, 8]);
    expect(play([2, 0, 4, 1, 6]).winLine).toEqual([2, 4, 6]);
  });

  it('lets o win too', () => {
    const s = play([0, 3, 1, 4, 8, 5]);
    expect(tictactoe.status(s)).toEqual({ winner: [o], over: true });
    expect(s.winLine).toEqual([3, 4, 5]);
  });

  it('wins on the last cell instead of calling it a draw', () => {
    // x o x / o x o / o x x, x's ninth mark completes 0-4-8
    const s = play([0, 1, 2, 3, 4, 5, 7, 6, 8]);
    expect(s.moves).toBe(9);
    expect(s.winner).toBe('x');
    expect(s.winLine).toEqual([0, 4, 8]);
    expect(s.draw).toBe(false);
  });

  it('calls a full board with no line a draw', () => {
    // x o x / x o o / o x x
    const s = play([0, 1, 2, 4, 3, 5, 7, 6, 8]);
    expect(s.winner).toBeNull();
    expect(tictactoe.status(s)).toEqual({ draw: true, over: true });
  });

  it('rejects moves after the end', () => {
    const s = play([0, 3, 1, 4, 2]);
    expect(tictactoe.apply(s, { cell: 8 }, o)).toEqual({ error: 'game-over' });
    expect(tictactoe.legalMoves!(s, o)).toEqual([]);
  });
});

describe('tic tac toe: 5x5', () => {
  it('needs four, three is not enough', () => {
    const s = play([0, 5, 1, 6, 2], 'five');
    expect(s.winner).toBeNull();
    const won = ok(tictactoe.apply(ok(tictactoe.apply(s, { cell: 7 }, o)), { cell: 3 }, x));
    expect(won.winner).toBe('x');
    expect(won.winLine).toEqual([0, 1, 2, 3]);
  });

  it('wins on a diagonal away from the corner', () => {
    // x on 1, 7, 13, 19 (down-right from row 0, col 1)
    const s = play([1, 0, 7, 5, 13, 10, 19], 'five');
    expect(s.winLine).toEqual([1, 7, 13, 19]);
  });

  it('wins on an anti-diagonal', () => {
    // x on 4, 8, 12, 16
    const s = play([4, 0, 8, 1, 12, 2, 16], 'five');
    expect(s.winLine).toEqual([4, 8, 12, 16]);
  });

  it('reports the whole run when a gap is filled to make five', () => {
    // x: 0 1 _ 3 4 then 2
    const s = play([0, 5, 1, 6, 3, 10, 4, 11, 2], 'five');
    expect(s.winLine).toEqual([0, 1, 2, 3, 4]);
  });

  it('does not wrap around the edge of a row', () => {
    // x on 3, 4, 5, 6: 3 and 4 end row 0, 5 and 6 start row 1
    const s = play([3, 10, 4, 11, 5, 15, 6], 'five');
    expect(s.winner).toBeNull();
  });
});

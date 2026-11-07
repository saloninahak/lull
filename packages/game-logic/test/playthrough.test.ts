import { describe, expect, it } from 'vitest';
import {
  bingo,
  boxCount,
  completedLines,
  dots,
  edgeCount,
  GOAL,
  isError,
  marksOf,
  morris,
  nextInt,
  PIECES,
  seedFrom,
  tictactoe,
  type BingoState,
  type DotsSize,
  type Game,
  type MorrisState,
  type Seat,
} from '../src';
import { players } from './helpers';

/**
 * seeded random games. every listed move must be accepted, the player to
 * move must always have a move until the game ends, and games must end.
 */

type Playable<S, M> = Pick<Game<S, M>, 'apply' | 'status' | 'legalMoves'>;

function randomPlay<S, M>(
  game: Playable<S, M>,
  start: S,
  seed: number,
  cap: number,
  each?: (s: S) => void,
): { state: S; steps: number } {
  let s = start;
  let rng = seed;
  let steps = 0;
  while (!game.status(s).over && steps < cap) {
    const mover = game.status(s).turn!;
    const moves = game.legalMoves!(s, mover);
    expect(moves.length).toBeGreaterThan(0);
    const [i, next] = nextInt(rng, moves.length);
    rng = next;
    const result = game.apply(s, moves[i]!, mover);
    expect(isError(result)).toBe(false);
    s = result as S;
    steps++;
    each?.(s);
  }
  return { state: s, steps };
}

describe('random playthroughs', () => {
  it('tic tac toe always ends, within the board size', () => {
    for (let g = 0; g < 300; g++) {
      const variant = g % 2 === 0 ? 'classic' : 'five';
      const start = tictactoe.init(players(2), { variant });
      const { state, steps } = randomPlay(tictactoe, start, seedFrom(`ttt${g}`), 100);
      expect(tictactoe.status(state).over).toBe(true);
      expect(steps).toBeLessThanOrEqual(state.board.length);
      if (state.winLine) {
        expect(state.winLine.length).toBeGreaterThanOrEqual(state.winLength);
        expect(state.winLine.every((c) => state.board[c] === state.winner)).toBe(true);
      }
    }
  });

  it('squares always ends with every box claimed', () => {
    const sizes: DotsSize[] = [4, 5, 6];
    for (let g = 0; g < 120; g++) {
      const size = sizes[g % 3]!;
      const start = dots.init(players(2 + (g % 3)), { size });
      const { state, steps } = randomPlay(dots, start, seedFrom(`dots${g}`), 1000);
      expect(dots.status(state).over).toBe(true);
      expect(steps).toBe(edgeCount(size));
      expect(state.scores.reduce((x, y) => x + y)).toBe(boxCount(size));
    }
  });

  it('morris never accepts a bad position or gets stuck', () => {
    let finished = 0;
    const check = (s: MorrisState) => {
      for (const seat of [0, 1] as Seat[]) {
        const onBoard = s.board.filter((p) => p === seat).length;
        expect(s.inHand[seat] + onBoard + s.lost[seat]).toBe(PIECES);
      }
    };
    for (let g = 0; g < 200; g++) {
      const { state } = randomPlay(
        morris,
        morris.init(players(2)),
        seedFrom(`morris${g}`),
        400,
        check,
      );
      const status = morris.status(state);
      if (status.over) {
        finished++;
        const loser = state.winner === 0 ? 1 : 0;
        const left = state.inHand[loser] + state.board.filter((p) => p === loser).length;
        const stuck = morris.legalMoves!({ ...state, winner: null }, state.players[loser]).length;
        expect(left < 3 || stuck === 0).toBe(true);
      }
    }
    // random play is aimless, but most games should still reach an end
    expect(finished).toBeGreaterThan(100);
  });

  it('bingo always ends with the first to five lines, within 25 calls', () => {
    for (let g = 0; g < 300; g++) {
      const start = bingo.init(players(2 + (g % 7)), { seed: g });
      let before: BingoState = start;
      const { state, steps } = randomPlay(bingo, start, seedFrom(`bingo${g}`), 30, (s) => {
        if (!bingo.status(s).over) before = s;
      });
      expect(bingo.status(state).over).toBe(true);
      expect(steps).toBeLessThanOrEqual(25);
      // lines on record always match the card
      for (const id of state.players) {
        const done = completedLines(marksOf(state.cards[id]!, state.called));
        expect([...state.lines[id]!].sort((x, y) => x - y)).toEqual(done);
      }
      // the winners have five, and nobody had five a call earlier
      for (const id of state.winners!) expect(state.lines[id]!.length).toBeGreaterThanOrEqual(GOAL);
      for (const id of before.players) expect(before.lines[id]!.length).toBeLessThan(GOAL);
    }
  });
});

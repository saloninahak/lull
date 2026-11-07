import { seedFrom, shuffle, type Seed } from './rng.ts';
import { checkPlayers, type Game, type MoveResult, type Player, type Status } from './types.ts';

/**
 * notebook bingo (readme 7.3).
 * everyone draws a 5x5 box and writes 1 to 25 in it, in any order. players
 * take turns calling out a number, and everyone crosses it off their own
 * card. a full row, column or diagonal is a line, and each line crosses off
 * one letter of b-i-n-g-o. the first to five lines wins.
 *
 * the app shuffles each card from a seed kept in the state, so the server,
 * same-screen play and tests all agree. calling crosses the number off
 * every card at once.
 */

export type BingoOptions = { seed?: Seed };

export type BingoState = {
  players: string[];
  /** 25 numbers per player, row-major, each 1 to 25 exactly once */
  cards: Record<string, number[]>;
  /** numbers in the order they were called */
  called: number[];
  /** seat index of whoever calls next */
  turn: number;
  /** completed line indexes (into LINES) per player, in the order they were made */
  lines: Record<string, number[]>;
  /** everyone who reached five lines on the winning call, or null */
  winners: string[] | null;
  /** the last call and the lines it completed, for the animations */
  last: { by: string; number: number; newLines: Record<string, number[]> } | null;
};

export type BingoMove = { type: 'call'; number: number };

export type BingoError =
  'game-over' | 'not-a-player' | 'not-your-turn' | 'out-of-range' | 'already-called';

export const NUMBERS = 25;
/** lines needed to win, one per letter */
export const GOAL = 5;
export const LETTERS = ['b', 'i', 'n', 'g', 'o'] as const;

/** rows, then columns, then the two diagonals */
// prettier-ignore
export const LINES: ReadonlyArray<readonly number[]> = [
  [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
  [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
  [0, 6, 12, 18, 24], [4, 8, 12, 16, 20],
];

const ONE_TO_25: readonly number[] = Array.from({ length: NUMBERS }, (_, i) => i + 1);

/* helpers ------------------------------------------------------------------- */

/** a card with 1 to 25 written anywhere, and the next seed */
export function makeCard(seed: Seed): [number[], Seed] {
  return shuffle(ONE_TO_25, seed);
}

/** which cells of a card are crossed off */
export function marksOf(card: readonly number[], called: readonly number[]): boolean[] {
  const set = new Set(called);
  return card.map((n) => set.has(n));
}

/** line indexes (into LINES) that are fully crossed off */
export function completedLines(marks: readonly boolean[]): number[] {
  return LINES.flatMap((line, i) => (line.every((c) => marks[c]) ? [i] : []));
}

/** numbers nobody has called yet */
export function uncalled(state: BingoState): number[] {
  const set = new Set(state.called);
  return ONE_TO_25.filter((n) => !set.has(n));
}

/** the most recent calls, newest first */
export function lastCalled(state: BingoState, n = 5): number[] {
  return state.called.slice(-n).reverse();
}

/* what one player may see --------------------------------------------------- */

/**
 * a player's view of the game. it holds their own card and nothing about
 * anyone else's: not the numbers, not which lines they made, only how many.
 * the server sends each phone its own view, so other cards never leave it.
 */
export type BingoView = {
  players: string[];
  /** the viewer's card, or null for someone who is not in this game */
  card: number[] | null;
  called: number[];
  turn: number;
  /** how many lines each player has */
  lineCounts: Record<string, number>;
  /** the viewer's own lines, in the order they were made */
  myLines: number[];
  winners: string[] | null;
  last: { by: string; number: number; myNewLines: number[] } | null;
};

export function bingoView(state: BingoState, viewerId: string): BingoView {
  const lineCounts: Record<string, number> = {};
  for (const id of state.players) lineCounts[id] = state.lines[id]?.length ?? 0;
  return {
    players: [...state.players],
    card: state.cards[viewerId] ? [...state.cards[viewerId]] : null,
    called: [...state.called],
    turn: state.turn,
    lineCounts,
    myLines: [...(state.lines[viewerId] ?? [])],
    winners: state.winners ? [...state.winners] : null,
    last: state.last
      ? {
          by: state.last.by,
          number: state.last.number,
          myNewLines: [...(state.last.newLines[viewerId] ?? [])],
        }
      : null,
  };
}

/* game ---------------------------------------------------------------------- */

export const bingo: Game<BingoState, BingoMove, BingoOptions, BingoError> = {
  id: 'bingo',
  minPlayers: 2,
  maxPlayers: 8,

  init(players: Player[], options?: BingoOptions): BingoState {
    checkPlayers(players, 2, 8);
    let rng = options?.seed ?? seedFrom(`bingo:${players.map((p) => p.id).join(',')}`);
    const cards: Record<string, number[]> = {};
    const lines: Record<string, number[]> = {};
    for (const p of players) {
      const [card, next] = makeCard(rng);
      rng = next;
      cards[p.id] = card;
      lines[p.id] = [];
    }
    return {
      players: players.map((p) => p.id),
      cards,
      called: [],
      turn: 0,
      lines,
      winners: null,
      last: null,
    };
  },

  view: bingoView,

  legalMoves(state, playerId) {
    if (state.winners || state.players[state.turn] !== playerId) return [];
    return uncalled(state).map((number) => ({ type: 'call', number }) as const);
  },

  apply(state, move, playerId): MoveResult<BingoState, BingoError> {
    if (state.winners) return { error: 'game-over' };
    const seat = state.players.indexOf(playerId);
    if (seat < 0) return { error: 'not-a-player' };
    if (seat !== state.turn) return { error: 'not-your-turn' };
    const { number } = move;
    if (!Number.isInteger(number) || number < 1 || number > NUMBERS) {
      return { error: 'out-of-range' };
    }
    if (state.called.includes(number)) return { error: 'already-called' };

    const called = [...state.called, number];
    const lines: Record<string, number[]> = {};
    const newLines: Record<string, number[]> = {};
    for (const id of state.players) {
      const before = state.lines[id] ?? [];
      const done = completedLines(marksOf(state.cards[id]!, called));
      const fresh = done.filter((l) => !before.includes(l));
      // keep the order lines were made in, so letters cross off in sequence
      lines[id] = [...before, ...fresh];
      newLines[id] = fresh;
    }

    const reached = state.players.filter((id) => lines[id]!.length >= GOAL);
    return {
      ...state,
      called,
      lines,
      winners: reached.length > 0 ? reached : null,
      turn: reached.length > 0 ? seat : (seat + 1) % state.players.length,
      last: { by: playerId, number, newLines },
    };
  },

  status(state): Status {
    if (state.winners) {
      // everyone reaching five on the same call is a draw
      if (state.winners.length === state.players.length) return { draw: true, over: true };
      return { winner: [...state.winners], over: true };
    }
    return { turn: state.players[state.turn], over: false };
  },
};

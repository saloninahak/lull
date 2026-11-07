import {
  asRecord,
  checkPlayers,
  type Game,
  type MoveResult,
  type Player,
  type Status,
} from './types.ts';

/**
 * rock paper scissors for the whole room (readme 7.10). everyone throws at
 * once, hidden until the last throw is in. when exactly two shapes are
 * showing, everyone who threw the winning one scores. all the same, or all
 * three, and nobody does. first to the target wins.
 */

export type Throw = 'rock' | 'paper' | 'scissors';
export const THROWS: readonly Throw[] = ['rock', 'paper', 'scissors'];
const BEATS: Record<Throw, Throw> = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

/** how long a round's throws stay on show before the next round */
export const RPS_REVEAL_MS = 2600;

export type RpsOptions = { target?: number };

export type RpsState = {
  players: string[];
  scores: number[];
  target: number;
  round: number;
  throws: Record<string, Throw | null>;
  phase: 'throwing' | 'reveal';
  revealUntil: number;
  last: { throws: Record<string, Throw>; winners: string[] } | null;
  winners: string[] | null;
};

export type RpsMove = { type: 'throw'; choice: Throw };
export type RpsError = 'game-over' | 'not-a-player' | 'wait' | 'already-thrown' | 'bad-throw';

/** what one player sees: their own throw, and only whether the others have thrown */
export type RpsView = Omit<RpsState, 'throws'> & {
  throws: Record<string, Throw | 'hidden' | null>;
};

export function roundWinners(throws: Record<string, Throw>): string[] {
  const shapes = [...new Set(Object.values(throws))];
  if (shapes.length !== 2) return [];
  const [a, b] = shapes as [Throw, Throw];
  const top = BEATS[a] === b ? a : b;
  return Object.keys(throws).filter((id) => throws[id] === top);
}

const empty = (players: readonly string[]) =>
  Object.fromEntries(players.map((id) => [id, null])) as Record<string, Throw | null>;

export const rps: Game<RpsState, RpsMove, RpsOptions, RpsError> = {
  id: 'rps',
  minPlayers: 2,
  maxPlayers: 8,

  init(players: Player[], options): RpsState {
    checkPlayers(players, 2, 8);
    const target = options?.target === 5 ? 5 : 3;
    const ids = players.map((p) => p.id);
    return {
      players: ids,
      scores: ids.map(() => 0),
      target,
      round: 1,
      throws: empty(ids),
      phase: 'throwing',
      revealUntil: 0,
      last: null,
      winners: null,
    };
  },

  view(state, viewer): RpsView {
    if (state.phase !== 'throwing') return { ...state };
    const throws: Record<string, Throw | 'hidden' | null> = {};
    for (const id of state.players) {
      const t = state.throws[id] ?? null;
      throws[id] = id === viewer ? t : t ? 'hidden' : null;
    }
    return { ...state, throws };
  },

  apply(state, move, by, ctx): MoveResult<RpsState, RpsError> {
    if (state.winners) return { error: 'game-over' };
    if (!state.players.includes(by)) return { error: 'not-a-player' };
    if (state.phase !== 'throwing') return { error: 'wait' };
    if (state.throws[by]) return { error: 'already-thrown' };
    const choice = asRecord(move)?.choice;
    if (!THROWS.includes(choice as Throw)) return { error: 'bad-throw' };

    const throws = { ...state.throws, [by]: choice as Throw };
    if (state.players.some((id) => !throws[id])) return { ...state, throws };

    const all = throws as Record<string, Throw>;
    const won = roundWinners(all);
    const scores = state.players.map(
      (id, i) => (state.scores[i] ?? 0) + (won.includes(id) ? 1 : 0),
    );
    const top = Math.max(...scores);
    const done = top >= state.target;
    return {
      ...state,
      throws,
      scores,
      phase: 'reveal',
      revealUntil: (ctx?.now ?? 0) + RPS_REVEAL_MS,
      last: { throws: all, winners: won },
      winners: done ? state.players.filter((_, i) => scores[i] === top) : null,
    };
  },

  tick(state, now) {
    if (state.phase !== 'reveal' || state.winners || now < state.revealUntil) return state;
    return { ...state, phase: 'throwing', throws: empty(state.players), round: state.round + 1 };
  },

  status(state): Status {
    if (state.winners) return { winner: [...state.winners], over: true };
    return { over: false };
  },
};

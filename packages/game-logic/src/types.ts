/**
 * the shared shape every game follows (readme section 6).
 * all functions are pure: same input, same output, inputs never mutated.
 */

export type GameId =
  | 'tictactoe'
  | 'dots'
  | 'morris'
  | 'bingo'
  | 'connect4'
  | 'skribbl'
  | 'pictionary'
  | 'wordchain'
  | 'hangman'
  | 'rps'
  | 'sudoku'
  | 'zip'
  | 'npat'
  | 'sim'
  | 'wordsearch'
  | 'futoshiki'
  | 'consequences'
  | 'onestory'
  | 'wordwheel';

export type Player = {
  id: string;
  name: string;
};

export type Status = {
  /** whose move it is. absent when the game is over or everyone moves at once */
  turn?: string;
  /** one id, or several when the top is shared */
  winner?: string[];
  draw?: boolean;
  over: boolean;
};

/** a rejected move. codes are mapped to calm words by the ui (copy.ts). */
export type MoveError<Code extends string = string> = { error: Code };

export type MoveResult<State, Code extends string = string> = State | MoveError<Code>;

/** the time a move arrives, from the server's clock. games stay time-free otherwise. */
export type Ctx = { now: number };

/** what a room passes to init besides the lobby options */
export type StartInfo = { seed?: number; now?: number; round?: number };

export interface Game<State, Move, Options = unknown, Code extends string = string> {
  id: GameId;
  minPlayers: number;
  maxPlayers: number;
  init(players: Player[], options?: Options & StartInfo): State;
  /**
   * what one player may see. defaults to everything. bingo hides other
   * players' cards, so a computer never even receives them.
   */
  view?(state: State, viewerId: string): unknown;
  legalMoves?(state: State, playerId: string): Move[];
  apply(state: State, move: Move, playerId: string, ctx?: Ctx): MoveResult<State, Code>;
  /** timed games move their clock on here. returns the same state when nothing changed. */
  tick?(state: State, now: number): State;
  status(state: State): Status;
}

export function isError<S, C extends string>(result: MoveResult<S, C>): result is MoveError<C> {
  return typeof result === 'object' && result !== null && 'error' in result;
}

/** thrown by init when a game is set up wrong. a programming error, not a player one. */
export class SetupError extends Error {
  override name = 'SetupError';
}

export function checkPlayers(players: Player[], min: number, max: number): void {
  if (players.length < min || players.length > max) {
    throw new SetupError(`needs ${min} to ${max} players, got ${players.length}`);
  }
  const ids = new Set(players.map((p) => p.id));
  if (ids.size !== players.length) throw new SetupError('player ids must be unique');
}

/** the leaders by score: everyone level is a draw, a shared top is a shared win */
export function scoreStatus(players: readonly string[], scores: readonly number[]): Status {
  const top = Math.max(...scores);
  const leaders = players.filter((_, i) => scores[i] === top);
  if (leaders.length === players.length && players.length > 1) return { draw: true, over: true };
  return { winner: leaders, over: true };
}

/** a plain object, or null. moves arrive from the network and are never trusted. */
export function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

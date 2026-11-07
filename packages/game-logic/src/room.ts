import { normalizeOptions, type OptionValues } from './options.ts';
import { nextInt, type Seed } from './rng.ts';
import { games } from './registry.ts';
import { isError, type Game, type GameId, type Status } from './types.ts';

/**
 * a room (readme 5): a code, a few seats, and at most one game at a time.
 * this is the whole room logic as pure functions. the server only adds
 * sockets, a clock and timers around it, which keeps it easy to test.
 */

/** a dropped player keeps their seat this long (readme 5.3) */
export const SEAT_HOLD_MS = 2 * 60_000;
export const NAME_MAX = 16;
/** a room seats this many, whatever the game. extra people watch. */
export const ROOM_MAX = 8;
/** letters that read clearly out loud: no i, l or o */
export const CODE_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
export const CODE_LENGTH = 4;
/** every game is played in a room (readme 1: in-house, everyone on their own pc) */
export const ONLINE_GAMES: readonly GameId[] = [
  'tictactoe',
  'dots',
  'morris',
  'bingo',
  'connect4',
  'skribbl',
  'pictionary',
  'wordchain',
  'hangman',
  'rps',
  'sudoku',
  'zip',
  'npat',
  'sim',
  'wordsearch',
  'futoshiki',
  'consequences',
  'onestory',
  'wordwheel',
];

export type RoomSeat = {
  id: string;
  name: string;
  joinedAt: number;
  connected: boolean;
  /** when they dropped, while their seat is being held */
  awaySince: number | null;
};

export type Match = {
  /** who is playing this round, in turn order */
  players: string[];
  state: unknown;
  round: number;
  /** the state before the last move, and who made it, so it can be taken back */
  prev?: { state: unknown; by: string } | null;
  /** someone asked to take their last move back, and the others haven't answered */
  takeback?: { by: string } | null;
};

/** turn games where asking to take a move back makes sense (readme 5.3) */
export const TAKEBACK_GAMES: readonly GameId[] = ['tictactoe', 'dots', 'morris', 'connect4', 'sim'];

/** a short, quiet line about what just happened */
export type RoomNote = { kind: 'left-mid-game'; name: string };

export type Room = {
  code: string;
  game: GameId;
  options: OptionValues;
  host: string | null;
  /** in the order people arrived */
  seats: RoomSeat[];
  match: Match | null;
  rounds: number;
  note: RoomNote | null;
};

export type RoomAction =
  | { type: 'join'; id: string; name: string; now: number }
  | { type: 'disconnect'; id: string; now: number }
  | { type: 'leave'; id: string }
  | { type: 'setup'; by: string; game: unknown; options: unknown }
  | { type: 'start'; by: string; seed: Seed; now: number }
  | { type: 'move'; by: string; move: unknown; now: number }
  | { type: 'lobby'; by: string }
  | { type: 'tick'; now: number }
  /** ask to take back your own last move */
  | { type: 'takeback'; by: string }
  /** say yes or no to someone else's ask */
  | { type: 'answer'; by: string; accept: boolean };

export type RoomError =
  | 'bad-name'
  | 'full'
  | 'not-host'
  | 'not-enough'
  | 'already-playing'
  | 'not-playing'
  | 'not-in-game'
  | 'bad-move'
  | 'bad-game'
  | 'no-takeback'
  | 'nothing-to-answer';

export type RoomResult = Room | { error: string };

/** what one player sees of the room */
export type RoomView = {
  code: string;
  game: GameId;
  options: OptionValues;
  you: string;
  host: string | null;
  /** the server's clock when this was sent, so timers agree on every pc */
  now: number;
  seats: Array<{ id: string; name: string; connected: boolean; inGame: boolean }>;
  note: RoomNote | null;
  match: null | {
    round: number;
    players: string[];
    status: Status;
    view: unknown;
    /** who is asking to take a move back, if anyone */
    takeback: { by: string } | null;
    /** whether this player may ask to take back their last move right now */
    canTakeBack: boolean;
  };
};

type AnyGame = Game<unknown, unknown, Record<string, unknown>, string>;
export const gameOf = (id: GameId) => games[id] as unknown as AnyGame;

/* helpers ------------------------------------------------------------------- */

/** a display name: printable, single spaces, at most 16 characters. null if empty. */
export function cleanName(raw: string): string | null {
  // any run of whitespace (tabs, new lines) becomes one space, other control characters go
  const printable = Array.from(raw.replace(/\s+/g, ' '))
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code >= 0x20 && code !== 0x7f;
    })
    .join('');
  const name = Array.from(printable.trim()).slice(0, NAME_MAX).join('').trim();
  return name.length > 0 ? name : null;
}

/** a 4-letter room code from a seed */
export function makeCode(seed: Seed): string {
  let s = seed;
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const [n, next] = nextInt(s, CODE_LETTERS.length);
    s = next;
    code += CODE_LETTERS[n];
  }
  return code;
}

/** "qbxt " or "Q B X T" becomes "QBXT". null if it can't be a code. */
export function normalizeCode(raw: string): string | null {
  const code = raw.replace(/\s+/g, '').toUpperCase();
  if (code.length !== CODE_LENGTH) return null;
  return [...code].every((ch) => CODE_LETTERS.includes(ch)) ? code : null;
}

export function createRoom(code: string, game: GameId, options: unknown = {}): Room {
  return {
    code,
    game,
    options: normalizeOptions(game, options),
    host: null,
    seats: [],
    match: null,
    rounds: 0,
    note: null,
  };
}

export function matchStatus(room: Room): Status | null {
  return room.match ? gameOf(room.game).status(room.match.state) : null;
}

const playing = (room: Room) => room.match !== null && !matchStatus(room)!.over;

/** the longest-present player, preferring someone who is connected */
function pickHost(seats: readonly RoomSeat[]): string | null {
  const byAge = [...seats].sort((a, b) => a.joinedAt - b.joinedAt);
  return (byAge.find((s) => s.connected) ?? byAge[0])?.id ?? null;
}

function removeSeat(room: Room, id: string): Room {
  const seat = room.seats.find((s) => s.id === id);
  if (!seat) return room;
  const seats = room.seats.filter((s) => s.id !== id);
  let { match, note } = room;
  // a game can't go on with a hole in it. end it quietly and say why.
  if (match && playing(room) && match.players.includes(id)) {
    match = null;
    note = { kind: 'left-mid-game', name: seat.name };
  }
  return { ...room, seats, match, note, host: room.host === id ? pickHost(seats) : room.host };
}

/**
 * who plays this round: everyone connected, in arrival order, turned by one
 * each round. so the first move moves around, and in two-player games the
 * people watching get their go.
 */
export function lineUp(room: Room): string[] {
  const present = room.seats.filter((s) => s.connected).map((s) => s.id);
  if (present.length === 0) return [];
  const shift = room.rounds % present.length;
  const turned = [...present.slice(shift), ...present.slice(0, shift)];
  return turned.slice(0, gameOf(room.game).maxPlayers);
}

/* the reducer --------------------------------------------------------------- */

export function reduceRoom(room: Room, action: RoomAction): RoomResult {
  switch (action.type) {
    case 'join': {
      const name = cleanName(action.name);
      if (!name) return { error: 'bad-name' };
      const existing = room.seats.find((s) => s.id === action.id);
      if (existing) {
        // a refresh or a second tab: same seat, back online
        return {
          ...room,
          seats: room.seats.map((s) =>
            s.id === action.id ? { ...s, name, connected: true, awaySince: null } : s,
          ),
        };
      }
      if (room.seats.length >= ROOM_MAX) return { error: 'full' };
      const seat: RoomSeat = {
        id: action.id,
        name,
        joinedAt: action.now,
        connected: true,
        awaySince: null,
      };
      return { ...room, seats: [...room.seats, seat], host: room.host ?? action.id };
    }

    case 'disconnect':
      return {
        ...room,
        seats: room.seats.map((s) =>
          s.id === action.id ? { ...s, connected: false, awaySince: action.now } : s,
        ),
      };

    case 'leave':
      return removeSeat(room, action.id);

    case 'setup': {
      if (room.host !== action.by) return { error: 'not-host' };
      if (playing(room)) return { error: 'already-playing' };
      const game = action.game;
      if (!ONLINE_GAMES.includes(game as GameId)) return { error: 'bad-game' };
      const id = game as GameId;
      return {
        ...room,
        game: id,
        options: normalizeOptions(id, action.options),
        // a different game is a fresh start: the last result goes
        match: id === room.game ? room.match : null,
        note: null,
      };
    }

    case 'tick': {
      let next = room;
      for (const s of room.seats) {
        if (!s.connected && s.awaySince !== null && action.now - s.awaySince >= SEAT_HOLD_MS) {
          next = removeSeat(next, s.id);
        }
      }
      const game = gameOf(next.game);
      if (next.match && game.tick) {
        const state = game.tick(next.match.state, action.now);
        if (state !== next.match.state) next = { ...next, match: { ...next.match, state } };
      }
      return next;
    }

    case 'start': {
      if (room.host !== action.by) return { error: 'not-host' };
      if (playing(room)) return { error: 'already-playing' };
      const game = gameOf(room.game);
      const players = lineUp(room);
      if (players.length < game.minPlayers) return { error: 'not-enough' };
      const round = room.rounds + 1;
      const state = game.init(
        players.map((id) => ({ id, name: room.seats.find((s) => s.id === id)!.name })),
        { ...room.options, seed: action.seed, now: action.now, round },
      );
      return { ...room, rounds: round, note: null, match: { players, state, round } };
    }

    case 'move': {
      if (!room.match) return { error: 'not-playing' };
      if (!room.match.players.includes(action.by)) return { error: 'not-in-game' };
      let result: unknown;
      try {
        result = gameOf(room.game).apply(room.match.state, action.move, action.by, {
          now: action.now,
        });
      } catch {
        // a move of the wrong shape. the rules never trust what arrives.
        return { error: 'bad-move' };
      }
      if (isError(result as { error: string })) return result as { error: string };
      // a new move answers any open ask: the game has moved on
      const keep = TAKEBACK_GAMES.includes(room.game);
      return {
        ...room,
        match: {
          ...room.match,
          state: result,
          prev: keep ? { state: room.match.state, by: action.by } : null,
          takeback: null,
        },
      };
    }

    case 'takeback': {
      if (!canTakeBack(room, action.by)) return { error: 'no-takeback' };
      return { ...room, match: { ...room.match!, takeback: { by: action.by } } };
    }

    case 'answer': {
      const match = room.match;
      const ask = match?.takeback;
      if (!match || !ask || !match.players.includes(action.by) || ask.by === action.by) {
        return { error: 'nothing-to-answer' };
      }
      if (!action.accept) return { ...room, match: { ...match, takeback: null } };
      return {
        ...room,
        match: { ...match, state: match.prev!.state, prev: null, takeback: null },
      };
    }

    case 'lobby':
      if (room.host !== action.by) return { error: 'not-host' };
      return { ...room, match: null, note: null };
  }
}

/**
 * a player may ask to take back the move they just made: in a turn game,
 * while it's still going, once per move, and not while an ask is open.
 */
export function canTakeBack(room: Room, by: string): boolean {
  const match = room.match;
  return (
    match !== null &&
    TAKEBACK_GAMES.includes(room.game) &&
    !matchStatus(room)!.over &&
    match.prev?.by === by &&
    !match.takeback
  );
}

/** what one player sees. the game decides what of its state is private. */
export function roomView(room: Room, viewerId: string, now = 0): RoomView {
  const game = gameOf(room.game);
  const match = room.match;
  return {
    code: room.code,
    game: room.game,
    options: room.options,
    you: viewerId,
    host: room.host,
    now,
    seats: room.seats.map((s) => ({
      id: s.id,
      name: s.name,
      connected: s.connected,
      inGame: match?.players.includes(s.id) ?? false,
    })),
    note: room.note,
    match: match
      ? {
          round: match.round,
          players: [...match.players],
          status: game.status(match.state),
          view: game.view ? game.view(match.state, viewerId) : match.state,
          takeback: match.takeback ?? null,
          canTakeBack: canTakeBack(room, viewerId),
        }
      : null,
  };
}

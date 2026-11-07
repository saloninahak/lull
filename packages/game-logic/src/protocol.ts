import type { RoomView } from './room.ts';
import type { GameId } from './types.ts';

/**
 * the messages between a computer and the room server, plus strict checks
 * for anything that arrives over the wire. the server trusts nothing it
 * hasn't parsed here.
 */

export type ClientMessage =
  | { t: 'hello'; code: string; id: string; name: string }
  | { t: 'setup'; game: string; options: Record<string, unknown> }
  | { t: 'start' }
  | { t: 'move'; move: unknown }
  | { t: 'lobby' }
  | { t: 'leave' }
  | { t: 'ping' }
  | { t: 'takeback' }
  | { t: 'answer'; accept: boolean };

export type ServerMessage =
  | { t: 'room'; room: RoomView }
  | { t: 'error'; error: string }
  /** the room does not exist (or no longer does) */
  | { t: 'gone' }
  | { t: 'pong' };

/** the biggest message a computer ever needs to send (a piece of a drawing) */
export const MAX_MESSAGE_BYTES = 2048;

/** random ids made on the device (readme 5.2) */
export const isPlayerId = (v: unknown): v is string =>
  typeof v === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(v);

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export function parseClientMessage(raw: string): ClientMessage | null {
  if (raw.length > MAX_MESSAGE_BYTES) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(data)) return null;
  switch (data.t) {
    case 'hello':
      if (typeof data.code !== 'string' || data.code.length > 8) return null;
      if (!isPlayerId(data.id)) return null;
      if (typeof data.name !== 'string' || data.name.length > 64) return null;
      return { t: 'hello', code: data.code, id: data.id, name: data.name };
    case 'setup':
      if (typeof data.game !== 'string' || data.game.length > 20) return null;
      return {
        t: 'setup',
        game: data.game,
        options: isObject(data.options) ? data.options : {},
      };
    case 'move':
      // only plain objects. the game checks everything inside.
      return isObject(data.move) ? { t: 'move', move: data.move } : null;
    case 'answer':
      return typeof data.accept === 'boolean' ? { t: 'answer', accept: data.accept } : null;
    case 'start':
    case 'lobby':
    case 'leave':
    case 'ping':
    case 'takeback':
      return { t: data.t };
    default:
      return null;
  }
}

/** the body of POST /api/rooms */
export function parseCreateRequest(
  raw: string,
  allowed: readonly GameId[],
): { game: GameId; options: Record<string, unknown> } | null {
  if (raw.length > MAX_MESSAGE_BYTES) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!isObject(data) || typeof data.game !== 'string') return null;
    if (!(allowed as readonly string[]).includes(data.game)) return null;
    return {
      game: data.game as GameId,
      options: isObject(data.options) ? data.options : {},
    };
  } catch {
    return null;
  }
}

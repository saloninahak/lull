import { playerLook, type RoomView } from '@lull/game-logic';
import type { SeatView } from '../../components/PlayerRow';
import { copy } from '../../copy';
import type { Connection } from '../../lib/rooms';

/**
 * seats as dots, colored by arrival order, so everyone keeps the same
 * color from the lobby through every round. pass ids to pick and order a few.
 */
export function seatViews(room: RoomView, ids?: readonly string[]): SeatView[] {
  const seats = ids ? ids.flatMap((id) => room.seats.filter((s) => s.id === id)) : room.seats;
  return seats.map((s) => ({
    id: s.id,
    name: s.name,
    ...playerLook(room.game, Math.max(0, room.seats.indexOf(s))),
    away: !s.connected,
  }));
}

/** the small line under the title: the room, reconnecting state, or lost */
export const subtitleFor = (room: RoomView, connection: Connection) =>
  connection === 'lost'
    ? copy.room.lost
    : connection === 'reconnecting'
      ? copy.room.reconnecting
      : copy.room.roomLabel(room.code);

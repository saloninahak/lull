import { landingRow, type Connect4State } from '@lull/game-logic';
import { nudge } from '../../lib/nudge';
import { OnlineFrame, type RoomGameProps } from '../rooms/OnlineFrame';
import { seatViews } from '../rooms/seats';
import { Connect4Board } from './Connect4Board';

/** connect four in a room. the server drops the disc; this pc only asks. */
export default function Connect4Room(props: RoomGameProps) {
  const { room, send } = props;
  const match = room.match!;
  const state = match.view as Connect4State;
  const seat = state.players.indexOf(room.you);
  const mine = !match.status.over && seat === state.turn;

  // discs wear their players' own colors, the same as their dots
  const seats = seatViews(room, state.players);
  const colors = [seats[0]?.color ?? 'red', seats[1]?.color ?? 'graphite'] as const;

  return (
    <OnlineFrame {...props}>
      <Connect4Board
        state={state}
        colors={colors}
        ghost={mine ? (seat as 0 | 1) : null}
        onColumn={(col, el) => {
          if (!mine || landingRow(state.board, col) < 0) return nudge(el);
          send({ t: 'move', move: { col } });
        }}
      />
    </OnlineFrame>
  );
}

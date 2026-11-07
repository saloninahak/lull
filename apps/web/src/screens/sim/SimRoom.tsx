import type { SimSeat, SimState } from '@lull/game-logic';
import { copy } from '../../copy';
import { nudge } from '../../lib/nudge';
import { OnlineFrame, type RoomGameProps } from '../rooms/OnlineFrame';
import { seatViews } from '../rooms/seats';
import { SimBoard } from './SimBoard';

/** sim in a room. the server draws the line and checks for triangles. */
export default function SimRoom(props: RoomGameProps) {
  const { room, send } = props;
  const match = room.match!;
  const state = match.view as SimState;
  const seat = state.players.indexOf(room.you);
  const mine = !match.status.over && seat === state.turn;

  // lines wear their players' own colors, the same as their dots
  const seats = seatViews(room, state.players);
  const colors = [seats[0]?.color ?? 'amber', seats[1]?.color ?? 'graphite'] as const;
  const count = (id: string) =>
    state.edges.filter((e) => e !== null && e === state.players.indexOf(id)).length;

  return (
    <OnlineFrame
      {...props}
      caption={(id) => copy.sim.lines(count(id))}
      captionLabel={(id, name) => `${name}, ${copy.sim.lines(count(id))}`}
    >
      <SimBoard
        key={match.round}
        state={state}
        colors={colors}
        round={match.round}
        mover={mine ? (seat as SimSeat) : null}
        onEdge={(edge, el) => {
          if (!mine || edge < 0 || state.edges[edge] !== null) return nudge(el);
          send({ t: 'move', move: { edge } });
        }}
      />
    </OnlineFrame>
  );
}

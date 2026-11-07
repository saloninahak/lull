import { type DotsState } from '@lull/game-logic';
import { copy } from '../../copy';
import { nudge } from '../../lib/nudge';
import { OnlineFrame, useNames, type RoomGameProps } from '../rooms/OnlineFrame';
import { seatViews } from '../rooms/seats';
import { DotsBoard } from './DotsBoard';

/** squares in a room: the same board, every line checked on the server */
export default function DotsRoom(props: RoomGameProps) {
  const { room, send } = props;
  const match = room.match!;
  const state = match.view as DotsState;
  const nameOf = useNames(room);
  const mine = match.status.turn === room.you;

  // the board colors boxes by seat, in the order this round's players sit
  const seats = seatViews(room, state.players).map((s) => ({
    name: Array.from(s.name)[0]?.toLowerCase() ?? '?',
    color: s.color,
  }));

  const lastBy = state.last ? state.edges[state.last.edge] : null;
  const again =
    !match.status.over && (state.last?.claimed.length ?? 0) > 0 && lastBy === state.turn;
  const line = again
    ? mine
      ? copy.room.goAgain
      : copy.play.goesAgain(nameOf(match.status.turn))
    : undefined;

  return (
    <OnlineFrame
      {...props}
      line={line}
      caption={(id) => String(state.scores[state.players.indexOf(id)] ?? 0)}
      captionLabel={(id, name) =>
        copy.dots.score(name, state.scores[state.players.indexOf(id)] ?? 0)
      }
    >
      <DotsBoard
        key={`${match.round}-${state.size}`}
        state={state}
        seats={seats}
        round={match.round}
        interactive={mine}
        onEdge={(edge, el) => {
          if (!mine || state.edges[edge] !== null) return nudge(el);
          send({ t: 'move', move: { edge } });
        }}
      />
    </OnlineFrame>
  );
}

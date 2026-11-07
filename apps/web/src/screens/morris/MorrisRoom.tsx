import { useState } from 'react';
import {
  counts,
  destinations,
  drawAvailable,
  removable as removableOf,
  stageOf,
  type MorrisState,
  type Seat,
} from '@lull/game-logic';
import { PillButton } from '../../components/PillButton';
import { copy } from '../../copy';
import { nudge } from '../../lib/nudge';
import { OnlineFrame, useNames, type RoomGameProps } from '../rooms/OnlineFrame';
import { seatViews } from '../rooms/seats';
import { MorrisBoard } from './MorrisBoard';

/** nine men's morris in a room. picking a piece up stays on this pc; moves go to the server. */
export default function MorrisRoom(props: RoomGameProps) {
  const { room, send } = props;
  const match = room.match!;
  const state = match.view as MorrisState;
  const { status } = match;
  const nameOf = useNames(room);
  const [picked, setPicked] = useState<number | null>(null);

  const mySeat = state.players.indexOf(room.you);
  const myTurn = mySeat >= 0 && mySeat === state.turn;
  const deciding = state.drawOffer !== null;
  const playing = !status.over && !deciding && myTurn;
  const stage = stageOf(state, state.turn);

  const selected =
    playing &&
    !state.removing &&
    stage !== 'placing' &&
    picked !== null &&
    state.board[picked] === state.turn
      ? picked
      : null;
  const targets = new Set(selected !== null ? destinations(state, selected) : []);
  const removable = new Set(playing ? removableOf(state) : []);

  const seats = seatViews(room, state.players);
  const boardSeats = [
    { name: seats[0]?.name ?? '', color: seats[0]?.color ?? 'red' },
    { name: seats[1]?.name ?? '', color: seats[1]?.color ?? 'graphite' },
  ] as const;

  const move = (m: Record<string, unknown>) => {
    setPicked(null);
    send({ t: 'move', move: m });
  };

  const onPoint = (p: number, el: Element) => {
    if (!playing) return nudge(el);
    if (state.removing) return removable.has(p) ? move({ type: 'remove', at: p }) : nudge(el);
    if (stage === 'placing')
      return state.board[p] === null ? move({ type: 'place', to: p }) : nudge(el);
    if (state.board[p] === state.turn) return setPicked(selected === p ? null : p);
    if (selected !== null && targets.has(p)) return move({ type: 'move', from: selected, to: p });
    nudge(el);
  };

  const who = myTurn ? copy.room.you : nameOf(status.turn);
  const line = deciding
    ? copy.morris.drawAsk(nameOf(status.turn))
    : state.removing
      ? copy.morris.remove(who)
      : stage === 'placing'
        ? copy.morris.place(who)
        : stage === 'flying'
          ? copy.morris.fly(who)
          : copy.morris.move(who);

  const decidingMe = deciding && status.turn === room.you;
  const below = decidingMe ? (
    <>
      <PillButton variant="quiet" onClick={() => move({ type: 'acceptDraw' })}>
        {copy.morris.accept}
      </PillButton>
      <PillButton variant="ghost" onClick={() => move({ type: 'declineDraw' })}>
        {copy.morris.decline}
      </PillButton>
    </>
  ) : playing && drawAvailable(state) ? (
    <PillButton variant="ghost" onClick={() => move({ type: 'offerDraw' })}>
      {copy.morris.offerDraw}
    </PillButton>
  ) : undefined;

  return (
    <OnlineFrame
      {...props}
      line={line}
      below={below}
      caption={(id) => {
        const c = counts(state, state.players.indexOf(id) as Seat);
        return copy.morris.counts(c.inHand, c.onBoard, c.lost);
      }}
      captionLabel={(id, name) => {
        const c = counts(state, state.players.indexOf(id) as Seat);
        return copy.morris.countsLabel(name, c.inHand, c.onBoard, c.lost);
      }}
    >
      <MorrisBoard
        state={state}
        seats={boardSeats}
        round={match.round}
        selected={selected}
        targets={targets}
        removable={removable}
        inert={!playing}
        onPoint={onPoint}
        onCancel={() => setPicked(null)}
      />
    </OnlineFrame>
  );
}

import type { TicTacToeState } from '@lull/game-logic';
import { nudge } from '../../lib/nudge';
import { OnlineFrame, type RoomGameProps } from '../rooms/OnlineFrame';
import { TicTacToeBoard } from './TicTacToeBoard';

/** tic tac toe in a room: the same board, every move checked on the server */
export default function TicTacToeRoom(props: RoomGameProps) {
  const { room, send } = props;
  const state = room.match!.view as TicTacToeState;
  const mine = room.match!.status.turn === room.you;
  const mark = (id: string) => (state.players[0] === id ? 'x' : 'o');

  return (
    <OnlineFrame {...props} caption={mark}>
      <TicTacToeBoard
        key={`${room.match!.round}-${state.size}`}
        state={state}
        round={room.match!.round}
        interactive={mine}
        onCell={(cell, el) => {
          if (!mine || state.board[cell] !== null) return nudge(el);
          send({ t: 'move', move: { cell } });
        }}
      />
    </OnlineFrame>
  );
}

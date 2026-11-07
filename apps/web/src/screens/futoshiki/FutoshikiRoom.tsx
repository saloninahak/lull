import { useState } from 'react';
import type { FutoshikiView } from '@lull/game-logic';
import { copy } from '../../copy';
import { OnlineFrame, type RoomGameProps } from '../rooms/OnlineFrame';
import { FutoshikiBoard } from './FutoshikiBoard';

/**
 * a futoshiki race. everyone gets the same puzzle; the others only see how
 * many cells you've filled. undo is yours, since your grid is only yours.
 */
export default function FutoshikiRoom(props: RoomGameProps) {
  const { room, send } = props;
  const view = room.match!.view as FutoshikiView;
  const total = view.size * view.size;
  const [history, setHistory] = useState<Array<{ cell: number; prev: number }>>([]);

  const set = (cell: number, digit: number) => {
    setHistory((h) => [...h, { cell, prev: view.grid?.[cell] ?? 0 }]);
    send({ t: 'move', move: { type: 'set', cell, digit } });
  };
  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    send({ t: 'move', move: { type: 'set', cell: last.cell, digit: last.prev } });
  };

  return (
    <OnlineFrame
      {...props}
      line={view.grid ? copy.futoshiki.race : copy.room.watchingRound}
      undo={{ can: history.length > 0 && !room.match!.status.over, run: undo }}
      caption={(id) => `${view.progress[id] ?? 0}/${total}`}
      captionLabel={(id, name) => copy.futoshiki.progress(name, view.progress[id] ?? 0, total)}
    >
      <FutoshikiBoard
        size={view.size}
        puzzle={view.puzzle}
        right={view.right}
        below={view.below}
        grid={view.grid}
        solution={view.solution}
        onSet={set}
      />
    </OnlineFrame>
  );
}

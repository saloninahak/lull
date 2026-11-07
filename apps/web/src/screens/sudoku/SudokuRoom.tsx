import { useState } from 'react';
import type { SudokuView } from '@lull/game-logic';
import { copy } from '../../copy';
import { OnlineFrame, type RoomGameProps } from '../rooms/OnlineFrame';
import { SudokuBoard } from './SudokuBoard';

/**
 * a sudoku race. everyone gets the same puzzle and fills their own grid.
 * the others only ever see how many cells you have left. there are no
 * hints here, since the answer never reaches any pc until someone wins.
 */
export default function SudokuRoom(props: RoomGameProps) {
  const { room, send } = props;
  const view = room.match!.view as SudokuView;
  const left = (id: string) => 81 - (view.progress[id] ?? 0);
  // your grid is your own, so undo just puts back what a cell held before
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
      line={view.grid ? copy.sudoku.race : copy.room.watchingRound}
      undo={{ can: history.length > 0 && !room.match!.status.over, run: undo }}
      caption={(id) => copy.sudoku.left(left(id))}
      captionLabel={(id, name) => copy.sudoku.progress(name, view.progress[id] ?? 0)}
    >
      <SudokuBoard puzzle={view.puzzle} grid={view.grid} solution={view.solution} onSet={set} />
    </OnlineFrame>
  );
}

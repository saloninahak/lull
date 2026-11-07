import { useState } from 'react';
import type { ZipView } from '@lull/game-logic';
import { PillButton } from '../../components/PillButton';
import { copy } from '../../copy';
import { OnlineFrame, type RoomGameProps } from '../rooms/OnlineFrame';
import { ZipBoard } from './ZipBoard';

/**
 * zip, the path puzzle. everyone races the same grid. your line lives on
 * this pc while you draw it, and goes to the server each time you lift.
 */
export default function ZipRoom(props: RoomGameProps) {
  const { room, send } = props;
  const view = room.match!.view as ZipView;
  const total = view.size * view.size;
  const playing = view.path !== null;
  const [draft, setDraft] = useState<number[]>(() => view.path ?? []);
  const editable = playing && !room.match!.status.over;

  const commit = (cells: number[]) => {
    setDraft(cells);
    send({ t: 'move', move: { type: 'path', cells } });
  };

  return (
    <OnlineFrame
      {...props}
      line={playing ? copy.zip.hint : copy.room.watchingRound}
      below={
        editable && draft.length > 0 ? (
          <>
            <PillButton variant="ghost" onClick={() => commit(draft.slice(0, -1))}>
              {copy.zip.undo}
            </PillButton>
            <PillButton variant="ghost" onClick={() => commit([])}>
              {copy.zip.reset}
            </PillButton>
          </>
        ) : undefined
      }
      caption={(id) => `${view.progress[id] ?? 0}/${total}`}
      captionLabel={(id, name) => copy.zip.progress(name, view.progress[id] ?? 0, total)}
    >
      <ZipBoard
        size={view.size}
        numbers={view.numbers}
        path={draft}
        editable={editable}
        onDraft={setDraft}
        onCommit={commit}
      />
    </OnlineFrame>
  );
}

import type { WordSearchView } from '@lull/game-logic';
import { copy } from '../../copy';
import { nudge } from '../../lib/nudge';
import { OnlineFrame, type RoomGameProps } from '../rooms/OnlineFrame';
import { WordSearchBoard } from './WordSearchBoard';

/**
 * a word search race. everyone gets the same grid. the others only ever
 * hear how many words you've found, never which ones or where.
 */
export default function WordSearchRoom(props: RoomGameProps) {
  const { room, send } = props;
  const view = room.match!.view as WordSearchView;
  const total = view.words.length;
  const playing = view.found !== null;

  return (
    <OnlineFrame
      {...props}
      line={playing ? copy.wordsearch.race : copy.room.watchingRound}
      caption={(id) => `${view.progress[id] ?? 0}/${total}`}
      captionLabel={(id, name) => copy.wordsearch.progress(name, view.progress[id] ?? 0, total)}
    >
      <WordSearchBoard
        size={view.size}
        grid={view.grid}
        words={view.words}
        found={view.found ?? []}
        editable={playing && !room.match!.status.over}
        onFind={(from, to, el) => {
          if (!playing) return nudge(el);
          send({ t: 'move', move: { type: 'find', from, to } });
        }}
      />
    </OnlineFrame>
  );
}

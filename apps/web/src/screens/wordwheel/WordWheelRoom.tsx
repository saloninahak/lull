import { useEffect, useRef } from 'react';
import type { WordWheelView } from '@lull/game-logic';
import { copy } from '../../copy';
import { nudge } from '../../lib/nudge';
import { OnlineFrame, type RoomGameProps } from '../rooms/OnlineFrame';
import { WordWheelBoard } from './WordWheelBoard';

/**
 * a word wheel race. everyone gets the same wheel and grid. the others only
 * ever hear how many words you've filled, never which ones.
 */
export default function WordWheelRoom(props: RoomGameProps) {
  const { room, send, refusal } = props;
  const match = room.match!;
  const view = match.view as WordWheelView;
  const total = view.slots.length;
  const playing = view.found !== null;
  const lastWord = useRef<HTMLElement | null>(null);
  // refusals from before this screen stay quiet
  const heard = useRef(refusal?.n ?? 0);

  // a word the server turns down gets the quiet nudge
  useEffect(() => {
    if (!refusal || refusal.n === heard.current) return;
    heard.current = refusal.n;
    nudge(lastWord.current);
  }, [refusal]);

  return (
    <OnlineFrame
      {...props}
      line={playing ? copy.wordwheel.race : copy.room.watchingRound}
      caption={(id) => `${view.progress[id] ?? 0}/${total}`}
      captionLabel={(id, name) => copy.wordwheel.progress(name, view.progress[id] ?? 0, total)}
    >
      <WordWheelBoard
        key={match.round}
        view={view}
        editable={playing && !match.status.over}
        onWord={(word, el) => {
          lastWord.current = el;
          send({ t: 'move', move: { type: 'word', word } });
        }}
      />
    </OnlineFrame>
  );
}

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { cleanStoryWord, END_AFTER, STORY_WORD_MAX, type OneStoryState } from '@lull/game-logic';
import { PillButton } from '../../components/PillButton';
import { copy } from '../../copy';
import { cx } from '../../lib/cx';
import { reveal } from '../../lib/motion';
import { nudge } from '../../lib/nudge';
import { ClockLine, OnlineFrame, useNames, type RoomGameProps } from '../rooms/OnlineFrame';

/**
 * one-word story. the story sits in the middle and grows a word at a time;
 * the newest word is in the accent. on your turn, one field and one pill.
 */
export default function OneStoryRoom(props: RoomGameProps) {
  const { room, send, offset } = props;
  const match = room.match!;
  const state = match.view as OneStoryState;
  const nameOf = useNames(room);
  const over = state.ended !== null;
  const mine = !over && state.players[state.turn] === room.you;
  const playing = state.players.includes(room.you);
  const [word, setWord] = useState('');
  const [bad, setBad] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const count = (id: string) => state.words.filter((w) => w.by === id).length;

  useEffect(() => {
    if (mine) field.current?.focus();
  }, [mine]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = cleanStoryWord(word);
    if (!clean) {
      setBad(true);
      return nudge(field.current);
    }
    send({ t: 'move', move: { type: 'word', word: clean } });
    setWord('');
    setBad(false);
  };

  const lineText = over
    ? state.ended === 'the-end' && state.endedBy
      ? copy.onestory.endedBy(nameOf(state.endedBy))
      : copy.onestory.full
    : mine
      ? copy.onestory.yourWord
      : copy.room.thinking(nameOf(state.players[state.turn]));

  const canEnd = state.words.length >= END_AFTER;

  return (
    <OnlineFrame
      {...props}
      line={
        over ? lineText : <ClockLine text={lineText} deadline={state.deadline} offset={offset} />
      }
      below={<p className="meta">{copy.onestory.count(state.words.length, state.limit)}</p>}
      caption={(id) => copy.onestory.words(count(id))}
      captionLabel={(id, name) => `${name}, ${copy.onestory.words(count(id))}`}
    >
      <div className="flex w-full max-w-[600px] flex-col items-center gap-6">
        <div
          aria-live="polite"
          aria-label={copy.onestory.story}
          className="min-h-[140px] w-full rounded-lg border border-hairline bg-surface px-7 py-6 shadow-calm"
        >
          {state.words.length === 0 ? (
            <p className="meta">{copy.onestory.empty}</p>
          ) : (
            <p className="text-[18px] leading-[1.8] text-ink">
              {state.words.map((w, i) => {
                const newest = i === state.words.length - 1 && !over;
                return (
                  <motion.span
                    key={i}
                    initial={newest ? { opacity: 0, y: 3 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reveal}
                    title={nameOf(w.by)}
                    className={cx('inline-block', newest && 'text-accent')}
                  >
                    {w.word}
                    {i < state.words.length - 1 ? '\u00a0' : ''}
                  </motion.span>
                );
              })}
              {over ? <span className="text-muted"> · {copy.onestory.theEnd}</span> : null}
            </p>
          )}
        </div>

        {!over && playing ? (
          <form onSubmit={submit} className="flex w-full max-w-[420px] flex-col items-center gap-3">
            <div className="flex w-full items-center gap-2">
              <label htmlFor="story-word" className="sr-only">
                {copy.onestory.yourWord}
              </label>
              <input
                ref={field}
                id="story-word"
                value={word}
                onChange={(e) => {
                  setWord(e.target.value.replace(/\s/g, ''));
                  setBad(false);
                }}
                disabled={!mine}
                placeholder={mine ? copy.onestory.placeholder : copy.onestory.wait}
                maxLength={STORY_WORD_MAX}
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="send"
                className="h-11 min-w-0 flex-1 rounded-pill border border-hairline bg-surface px-4 text-[15px] text-ink placeholder:text-muted hover:border-ink/15 focus-visible:outline-offset-0 disabled:opacity-60"
              />
              <PillButton type="submit" disabled={!mine || !word}>
                {copy.onestory.add}
              </PillButton>
            </div>
            {bad ? <p className="meta">{copy.onestory.badWord}</p> : null}
            {mine ? (
              <PillButton
                variant="ghost"
                aria-disabled={!canEnd}
                className={canEnd ? undefined : 'opacity-40'}
                onClick={(e) =>
                  canEnd ? send({ t: 'move', move: { type: 'end' } }) : nudge(e.currentTarget)
                }
              >
                {canEnd ? copy.onestory.end : copy.onestory.endAfter(END_AFTER)}
              </PillButton>
            ) : null}
          </form>
        ) : null}
      </div>
    </OnlineFrame>
  );
}

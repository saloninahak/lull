import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LINE_MAX, type ConsequencePrompt, type ConsequencesView } from '@lull/game-logic';
import { PillButton } from '../../components/PillButton';
import { copy } from '../../copy';
import { reveal } from '../../lib/motion';
import { nudge } from '../../lib/nudge';
import { ClockLine, OnlineFrame, useNames, type RoomGameProps } from '../rooms/OnlineFrame';

/**
 * consequences. while writing, a sheet of paper: the one line above the
 * fold, then a dashed fold, then your line. at the end, every sheet is
 * unfolded, one story at a time.
 */
export default function ConsequencesRoom(props: RoomGameProps) {
  const { room, send, offset } = props;
  const match = room.match!;
  const view = match.view as ConsequencesView;
  const nameOf = useNames(room);
  const playing = view.players.includes(room.you);
  const total = view.prompts.length;
  const writing = view.phase === 'write';

  const line = writing
    ? copy.consequences.lineOf(view.step + 1, total)
    : copy.consequences.unfolded;

  return (
    <OnlineFrame
      {...props}
      line={writing ? <ClockLine text={line} deadline={view.deadline} offset={offset} /> : line}
      caption={(id) =>
        writing
          ? view.done.includes(id)
            ? copy.consequences.passed
            : copy.consequences.writing
          : ''
      }
      captionLabel={(id, name) =>
        `${name}, ${view.done.includes(id) ? copy.consequences.passed : copy.consequences.writing}`
      }
    >
      {writing ? (
        playing ? (
          <Sheet
            key={view.step}
            view={view}
            onWrite={(text) => send({ t: 'move', move: { type: 'write', text } })}
          />
        ) : (
          <p className="meta">{copy.room.watchingRound}</p>
        )
      ) : (
        <Stories view={view} nameOf={nameOf} />
      )}
    </OnlineFrame>
  );
}

function Sheet({ view, onWrite }: { view: ConsequencesView; onWrite: (text: string) => void }) {
  const [text, setText] = useState('');
  const field = useRef<HTMLInputElement>(null);
  const prompt = view.prompt as ConsequencePrompt;
  const sent = view.mine !== null;

  useEffect(() => {
    if (!sent) field.current?.focus();
  }, [sent]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return nudge(field.current);
    onWrite(text);
  };

  return (
    <div className="flex w-full max-w-[460px] flex-col items-stretch gap-5">
      <div className="rounded-lg border border-hairline bg-surface px-6 pt-5 pb-6 shadow-calm">
        {view.above !== null ? (
          <>
            <p className="meta">{copy.consequences.above}</p>
            <p className="mt-1.5 text-[16px] leading-relaxed text-ink">{view.above}</p>
            <div aria-hidden="true" className="-mx-6 my-5 border-t border-dashed border-ink/20" />
          </>
        ) : (
          <p className="meta mb-4">{copy.consequences.first}</p>
        )}

        {sent ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={reveal}>
            <p className="meta">{copy.consequences.prompt[prompt]}</p>
            <p className="mt-1.5 text-[16px] leading-relaxed text-muted">{view.mine}</p>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <label htmlFor="consequence-line" className="meta">
              {copy.consequences.prompt[prompt]}
            </label>
            <input
              ref={field}
              id="consequence-line"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={copy.consequences.example[prompt]}
              maxLength={LINE_MAX}
              autoComplete="off"
              enterKeyHint="send"
              className="h-11 w-full rounded-pill border border-hairline bg-paper px-4 text-[15px] text-ink placeholder:text-muted hover:border-ink/15 focus-visible:outline-offset-0"
            />
            <PillButton type="submit" disabled={!text.trim()} className="self-end">
              {copy.consequences.pass}
            </PillButton>
          </form>
        )}
      </div>
      {sent ? (
        <p className="meta text-center">
          {copy.consequences.waiting(view.done.length, view.players.length)}
        </p>
      ) : null}
    </div>
  );
}

function Stories({ view, nameOf }: { view: ConsequencesView; nameOf: (id: string) => string }) {
  const stories = view.stories ?? [];
  const [at, setAt] = useState(0);
  const story = stories[at] ?? [];

  return (
    <div className="flex w-full max-w-[520px] flex-col items-center gap-5">
      <p className="meta">{copy.consequences.storyOf(at + 1, stories.length)}</p>
      <div className="w-full rounded-lg border border-hairline bg-surface px-7 py-6 shadow-calm">
        <AnimatePresence mode="wait">
          <motion.ol
            key={at}
            aria-label={copy.consequences.storyOf(at + 1, stories.length)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="flex flex-col gap-3"
          >
            {story.map((l, i) => {
              const lead = copy.consequences.lead[view.prompts[i]!];
              return (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...reveal, delay: 0.06 + i * 0.09 }}
                  className="flex items-baseline justify-between gap-4"
                >
                  <span className="text-[17px] leading-relaxed text-ink">
                    {lead ? <span className="text-muted">{lead} </span> : null}
                    {l.text}
                  </span>
                  <span className="meta shrink-0">{nameOf(l.by)}</span>
                </motion.li>
              );
            })}
          </motion.ol>
        </AnimatePresence>
      </div>
      {stories.length > 1 ? (
        <div className="flex gap-2">
          <PillButton variant="ghost" disabled={at === 0} onClick={() => setAt(at - 1)}>
            {copy.consequences.previous}
          </PillButton>
          <PillButton
            variant="quiet"
            disabled={at === stories.length - 1}
            onClick={() => setAt(at + 1)}
          >
            {copy.consequences.next}
          </PillButton>
        </div>
      ) : null}
    </div>
  );
}

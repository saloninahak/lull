import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CATEGORIES, onLetter, struck, type NpatView } from '@lull/game-logic';
import { PillButton } from '../../components/PillButton';
import { copy } from '../../copy';
import { cx } from '../../lib/cx';
import { settle } from '../../lib/motion';
import { nudge } from '../../lib/nudge';
import type { Send } from '../../lib/rooms';
import { ClockLine, OnlineFrame, useNames, type RoomGameProps } from '../rooms/OnlineFrame';

/** an answer goes to the server this long after you stop typing in it */
const SEND_AFTER_MS = 250;

/**
 * name, place, animal, thing. one big letter, four quiet fields and a
 * clock. then everyone's answers side by side, to be read out and, when
 * the room agrees, struck.
 */
export default function NpatRoom(props: RoomGameProps) {
  const { room, send, offset } = props;
  const match = room.match!;
  const view = match.view as NpatView;
  const nameOf = useNames(room);
  const playing = view.players.includes(room.you);
  const scoreOf = (id: string) => view.scores[view.players.indexOf(id)] ?? 0;
  const writing = view.phase === 'write';

  const lineText = writing
    ? view.stoppedBy
      ? view.stoppedBy === room.you
        ? copy.npat.youStopped
        : copy.npat.stopped(nameOf(view.stoppedBy))
      : copy.npat.roundOf(view.round, view.rounds)
    : view.phase === 'check'
      ? copy.npat.reading
      : '';

  const mine = view.last?.points[room.you];
  const below =
    writing && view.last && mine ? (
      <p className="meta">
        {copy.npat.lastRound(
          view.last.letter,
          mine.reduce((x, y) => x + y, 0),
        )}
      </p>
    ) : undefined;

  return (
    <OnlineFrame
      {...props}
      line={
        view.phase === 'done' ? undefined : (
          <ClockLine text={lineText} deadline={view.deadline} offset={offset} />
        )
      }
      below={below}
      caption={(id) => (writing ? copy.npat.filled(view.filled[id] ?? 0) : String(scoreOf(id)))}
      captionLabel={(id, name) =>
        writing
          ? copy.npat.filledLabel(name, view.filled[id] ?? 0)
          : copy.room.score(name, scoreOf(id))
      }
    >
      <div className="flex w-full flex-col items-center">
        {view.phase === 'done' ? (
          <p className="meta mt-2">{copy.npat.lastLetter(view.letter)}</p>
        ) : (
          <>
            <p className="meta">{copy.npat.startsWith}</p>
            <div className="relative mt-1 flex h-[84px] items-center justify-center">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={view.letter}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.14 } }}
                  transition={settle}
                  className="display block text-[76px] text-accent"
                >
                  {view.letter}
                </motion.span>
              </AnimatePresence>
            </div>
          </>
        )}

        {writing ? (
          playing ? (
            <WriteForm key={view.round} view={view} me={room.you} send={send} />
          ) : (
            <p className="meta mt-6">{copy.room.watchingRound}</p>
          )
        ) : (
          <ReadOut view={view} me={room.you} nameOf={nameOf} send={send} playing={playing} />
        )}
      </div>
    </OnlineFrame>
  );
}

/* writing ------------------------------------------------------------------- */

function WriteForm({ view, me, send }: { view: NpatView; me: string; send: Send }) {
  const [drafts, setDrafts] = useState<string[]>(() => view.answers[me] ?? ['', '', '', '']);
  const timers = useRef<Array<number | undefined>>([]);
  const fields = useRef<Array<HTMLInputElement | null>>([]);
  const latest = useRef(drafts);
  useEffect(() => {
    latest.current = drafts;
  });

  const push = (field: number) => {
    window.clearTimeout(timers.current[field]);
    timers.current[field] = undefined;
    send({ t: 'move', move: { type: 'answer', field, text: latest.current[field] ?? '' } });
  };

  // when the round ends, writing ends with it: nothing waiting is sent late
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const change = (field: number, text: string) => {
    setDrafts((d) => d.map((v, i) => (i === field ? text : v)));
    window.clearTimeout(timers.current[field]);
    timers.current[field] = window.setTimeout(() => push(field), SEND_AFTER_MS);
  };

  const canStop = !view.stoppedBy && drafts.every((d) => onLetter(d, view.letter));

  const stop = (el: Element) => {
    if (!canStop) return nudge(el);
    // every answer first, so the server has all four before the stop
    CATEGORIES.forEach((_, i) => push(i));
    send({ t: 'move', move: { type: 'stop' } });
  };

  const onKey = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    push(i);
    fields.current[i + 1]?.focus();
  };

  return (
    <div className="mt-6 flex w-full max-w-[560px] flex-col items-center gap-6">
      <div role="group" aria-label={copy.npat.answers} className="grid w-full gap-3 sm:grid-cols-2">
        {CATEGORIES.map((category, i) => {
          const text = drafts[i] ?? '';
          const good = onLetter(text, view.letter);
          return (
            <label key={category} className="flex flex-col gap-1.5">
              <span className="meta flex items-center gap-2 pl-4">
                {copy.npat.category[category]}
                <span
                  aria-hidden="true"
                  className={cx(
                    'size-1.5 rounded-full transition-opacity duration-200',
                    good ? 'bg-accent opacity-100' : 'opacity-0',
                  )}
                />
              </span>
              <input
                ref={(el) => {
                  fields.current[i] = el;
                }}
                value={text}
                onChange={(e) => change(i, e.target.value)}
                onBlur={() => push(i)}
                onKeyDown={onKey(i)}
                placeholder={copy.npat.placeholder(view.letter)}
                maxLength={30}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                autoFocus={i === 0}
                enterKeyHint={i === CATEGORIES.length - 1 ? 'done' : 'next'}
                className={cx(
                  'h-11 w-full rounded-pill border border-hairline bg-surface px-4 text-[15px] text-ink',
                  'placeholder:text-muted transition-colors duration-200 ease-soft',
                  'hover:border-ink/15 focus-visible:outline-offset-0',
                )}
              />
            </label>
          );
        })}
      </div>
      <div className="flex flex-col items-center gap-2">
        <PillButton
          aria-disabled={!canStop}
          className={cx('min-w-32', !canStop && 'opacity-40')}
          onClick={(e) => stop(e.currentTarget)}
        >
          {copy.npat.stop}
        </PillButton>
        {!view.stoppedBy && !canStop ? <p className="meta">{copy.npat.stopHint}</p> : null}
      </div>
    </div>
  );
}

/* reading out --------------------------------------------------------------- */

function ReadOut({
  view,
  me,
  nameOf,
  send,
  playing,
}: {
  view: NpatView;
  me: string;
  nameOf: (id: string) => string;
  send: Send;
  playing: boolean;
}) {
  const points = view.points ?? view.last?.points ?? {};
  const checking = view.phase === 'check';
  const iAmReady = view.ready.includes(me);

  return (
    <div className="mt-6 flex w-full flex-col items-center gap-6">
      <div className="w-full max-w-[820px] overflow-x-auto">
        <table aria-label={copy.npat.table} className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="meta py-2 pr-4 font-normal">
                <span className="sr-only">{copy.play.players}</span>
              </th>
              {CATEGORIES.map((c) => (
                <th key={c} scope="col" className="meta px-2 py-2 font-normal">
                  {copy.npat.category[c]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.players.map((p) => (
              <tr key={p} className="border-t border-hairline">
                <th scope="row" className="py-1.5 pr-4 text-[14px] font-medium whitespace-nowrap">
                  {nameOf(p)}
                </th>
                {CATEGORIES.map((c, f) => {
                  const text = view.answers[p]?.[f] ?? '';
                  const out = struck(view, p, f);
                  const pts = out ? 0 : (points[p]?.[f] ?? 0);
                  const flagged = (view.flags[`${p}:${f}`] ?? []).includes(me);
                  const canFlag = checking && playing && p !== me && text.trim() !== '';
                  return (
                    <td key={c} className="px-1 py-1.5">
                      <button
                        type="button"
                        aria-pressed={canFlag ? flagged : undefined}
                        aria-disabled={!canFlag}
                        aria-label={copy.npat.cell(
                          nameOf(p),
                          copy.npat.category[c] ?? c,
                          text,
                          pts,
                          flagged,
                          out,
                        )}
                        title={canFlag ? copy.npat.flag : undefined}
                        onClick={(e) => {
                          if (!canFlag) return nudge(e.currentTarget);
                          send({ t: 'move', move: { type: 'flag', player: p, field: f } });
                        }}
                        className={cx(
                          'flex h-11 w-full min-w-[120px] items-center justify-between gap-3 rounded-md px-3 text-left',
                          'transition-colors duration-200 ease-soft',
                          flagged ? 'bg-ink/[0.07]' : canFlag ? 'hover:bg-paper-soft' : '',
                          canFlag ? 'cursor-pointer' : 'cursor-default',
                        )}
                      >
                        <span
                          className={cx(
                            'truncate text-[14px]',
                            !text.trim()
                              ? 'text-faint'
                              : out
                                ? 'text-muted line-through'
                                : 'text-ink',
                          )}
                        >
                          {text.trim() || '—'}
                        </span>
                        <span
                          className={cx(
                            'shrink-0 font-mono text-[12px] tabular-nums',
                            pts === 10 ? 'text-accent' : pts ? 'text-ink' : 'text-faint',
                          )}
                        >
                          {copy.npat.points(pts)}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {checking && playing ? (
        iAmReady ? (
          <p className="meta">{copy.npat.waiting(view.ready.length, view.players.length)}</p>
        ) : (
          <PillButton variant="quiet" onClick={() => send({ t: 'move', move: { type: 'ready' } })}>
            {copy.npat.ready}
          </PillButton>
        )
      ) : null}
    </div>
  );
}

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { drawerOf, type DrawView, type StrokeWidth } from '@lull/game-logic';
import { PillButton } from '../../components/PillButton';
import { Segmented } from '../../components/Segmented';
import { copy } from '../../copy';
import { cx } from '../../lib/cx';
import { nudge } from '../../lib/nudge';
import { ClockLine, OnlineFrame, useNames, type RoomGameProps } from '../rooms/OnlineFrame';
import { DrawCanvas } from './DrawCanvas';

const PENS: ReadonlyArray<{ value: StrokeWidth; label: string }> = ([1, 2, 3] as const).map(
  (value) => ({ value, label: copy.draw.pens[value]! }),
);

/**
 * skribbl and pictionary share this screen. one person draws a word they
 * picked from three. in skribbl the others type guesses; in pictionary
 * they say it out loud and the drawer taps whoever got it first.
 */
export function DrawRoom(props: RoomGameProps) {
  const { room, send, offset } = props;
  const match = room.match!;
  const view = match.view as DrawView;
  const nameOf = useNames(room);
  const typed = view.mode === 'typed';
  const [pen, setPen] = useState<StrokeWidth>(1);

  const drawer = drawerOf(view);
  const isDrawer = drawer === room.you;
  const playing = view.players.includes(room.you);
  const knows = view.word !== null;
  const gotIt = view.correct.includes(room.you);
  const scoreOf = (id: string) => view.scores[view.players.indexOf(id)] ?? 0;
  const round = Math.floor(view.turn / view.players.length) + 1;

  const line =
    view.phase === 'choose'
      ? isDrawer
        ? copy.draw.pickWord
        : copy.draw.choosing(nameOf(drawer))
      : view.phase === 'reveal' && view.last
        ? `${copy.draw.gotIt(view.last.correct.map(nameOf))} ${copy.draw.wasWord(view.last.word)}`
        : isDrawer && view.word
          ? copy.draw.yourWord(view.word)
          : gotIt && view.word
            ? copy.draw.youGotIt(view.word)
            : typed
              ? copy.draw.drawing(nameOf(drawer))
              : copy.draw.sayIt(nameOf(drawer));

  const send1 = (move: Record<string, unknown>) => send({ t: 'move', move });

  return (
    <OnlineFrame
      {...props}
      line={
        <ClockLine
          text={line}
          deadline={view.phase === 'done' ? null : view.deadline}
          offset={offset}
        />
      }
      caption={(id) =>
        id === drawer && view.phase !== 'done'
          ? `${scoreOf(id)} · ${copy.draw.drawer}`
          : view.correct.includes(id) && view.phase === 'draw'
            ? `${scoreOf(id)} · ${copy.draw.got}`
            : String(scoreOf(id))
      }
      captionLabel={(id, name) => copy.room.score(name, scoreOf(id))}
    >
      <div className="flex w-full flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-center lg:gap-10">
        <DrawCanvas
          key={view.turn}
          strokes={view.strokes}
          interactive={isDrawer && view.phase === 'draw'}
          pen={pen}
          corner={copy.draw.roundOf(round, view.rounds)}
          onPiece={({ pts, cont, w }) => send1({ type: 'stroke', w, pts, cont })}
        >
          {view.phase === 'choose' && isDrawer && view.choices ? (
            <div
              role="group"
              aria-label={copy.draw.pickWord}
              className="flex flex-wrap justify-center gap-2"
            >
              {view.choices.map((w, i) => (
                <PillButton
                  key={w}
                  variant="quiet"
                  onClick={() => send1({ type: 'choose', index: i })}
                >
                  {w}
                </PillButton>
              ))}
            </div>
          ) : null}
        </DrawCanvas>

        <div className="flex min-h-[96px] w-full max-w-[520px] flex-col items-center gap-4 lg:w-[280px] lg:items-start lg:pt-3">
          {/* the word's shape, with letters showing as the clock runs down */}
          {view.phase === 'draw' && !knows ? (
            <p
              aria-label={copy.draw.shown(view.hint, view.shown)}
              className="flex h-7 items-end gap-1.5 font-mono text-[17px]"
            >
              {view.shown.map((ch, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className={cx(
                    'w-3 border-b-[1.5px] text-center leading-none',
                    ch ? 'border-transparent text-ink' : 'border-ink/30',
                  )}
                >
                  {ch ?? ''}
                </span>
              ))}
            </p>
          ) : null}
          {view.phase === 'draw' && isDrawer ? (
            <>
              <Segmented label={copy.draw.pen} options={PENS} value={pen} onChange={setPen} />
              <div className="flex gap-2 lg:-ml-5">
                <PillButton
                  variant="ghost"
                  disabled={view.strokes.length === 0}
                  onClick={() => send1({ type: 'undo' })}
                >
                  {copy.draw.undo}
                </PillButton>
                <PillButton
                  variant="ghost"
                  disabled={view.strokes.length === 0}
                  onClick={() => send1({ type: 'clear' })}
                >
                  {copy.draw.clear}
                </PillButton>
              </div>
              {!typed ? (
                <AwardRow
                  view={view}
                  drawer={drawer}
                  nameOf={nameOf}
                  onAward={(to) => send1({ type: 'award', to })}
                />
              ) : null}
            </>
          ) : null}

          {view.phase === 'draw' && typed && playing && !isDrawer ? (
            <GuessForm done={gotIt} onGuess={(text) => send1({ type: 'guess', text })} />
          ) : null}

          {typed && view.phase === 'draw' && view.misses.length > 0 ? (
            <ul
              aria-label={copy.draw.wrongGuesses}
              className="flex max-w-full flex-wrap justify-center gap-x-4 gap-y-1 lg:flex-col lg:justify-start"
            >
              {view.misses.map((m, i) => (
                <li key={`${i}-${m.text}`} className="meta">
                  <span className="text-ink">{nameOf(m.by)}</span> {m.text}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </OnlineFrame>
  );
}

function GuessForm({ done, onGuess }: { done: boolean; onGuess: (text: string) => void }) {
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!done) input.current?.focus();
  }, [done]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean || done) return nudge(input.current);
    onGuess(clean);
    setText('');
  };

  return (
    <form onSubmit={submit} className="flex w-full max-w-[360px] items-center gap-2 lg:max-w-none">
      <label className="sr-only" htmlFor="draw-guess">
        {copy.draw.guess}
      </label>
      <input
        ref={input}
        id="draw-guess"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={done ? copy.draw.waitOthers : copy.draw.guessPlaceholder}
        disabled={done}
        maxLength={40}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="send"
        className={cx(
          'h-11 min-w-0 flex-1 rounded-pill border border-hairline bg-surface px-4 text-[15px] text-ink',
          'placeholder:text-muted transition-colors duration-200 ease-soft hover:border-ink/15',
          'focus-visible:outline-offset-0 disabled:opacity-60',
        )}
      />
      <PillButton type="submit" disabled={done || !text.trim()}>
        {copy.draw.guess}
      </PillButton>
    </form>
  );
}

function AwardRow({
  view,
  drawer,
  nameOf,
  onAward,
}: {
  view: DrawView;
  drawer: string;
  nameOf: (id: string) => string;
  onAward: (to: string | null) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 lg:items-start">
      <p className="meta">{copy.draw.whoSaid}</p>
      <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
        {view.players
          .filter((id) => id !== drawer)
          .map((id) => (
            <PillButton key={id} variant="quiet" onClick={() => onAward(id)}>
              {nameOf(id)}
            </PillButton>
          ))}
        <PillButton variant="ghost" onClick={() => onAward(null)}>
          {copy.draw.nobody}
        </PillButton>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { drawerOf, type DrawView, type StrokeWidth } from '@lull/game-logic';
import { PillButton } from '../../components/PillButton';
import { Segmented } from '../../components/Segmented';
import { copy } from '../../copy';
import { cx } from '../../lib/cx';
import { ClockLine, OnlineFrame, useNames, type RoomGameProps } from '../rooms/OnlineFrame';
import { DrawCanvas } from './DrawCanvas';

const PENS: ReadonlyArray<{ value: StrokeWidth; label: string }> = ([1, 2, 3] as const).map(
  (value) => ({ value, label: copy.draw.pens[value]! }),
);

/**
 * pictionary: one person draws a word they picked from three. everyone
 * else says it out loud, and the drawer taps whoever got it first.
 */
export default function PictionaryRoom(props: RoomGameProps) {
  const { room, send, offset } = props;
  const match = room.match!;
  const view = match.view as DrawView;
  const nameOf = useNames(room);
  const [pen, setPen] = useState<StrokeWidth>(1);

  const drawer = drawerOf(view);
  const isDrawer = drawer === room.you;
  const knows = view.word !== null;
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
              <AwardRow
                view={view}
                drawer={drawer}
                nameOf={nameOf}
                onAward={(to) => send1({ type: 'award', to })}
              />
            </>
          ) : null}
        </div>
      </div>
    </OnlineFrame>
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
      <p className="text-[15px] font-medium text-ink">{copy.draw.whoSaid}</p>
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

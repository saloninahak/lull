import { motion } from 'motion/react';
import { THROWS, type RpsView, type Throw } from '@lull/game-logic';
import { copy } from '../../copy';
import { cx } from '../../lib/cx';
import { settle } from '../../lib/motion';
import { nudge } from '../../lib/nudge';
import { useRoving } from '../../lib/roving';
import { OnlineFrame, useNames, type RoomGameProps } from '../rooms/OnlineFrame';

const POINTS = THROWS.map((_, i) => [i, 0] as const);

/**
 * rock paper scissors for the whole room. everyone picks at once; nobody
 * sees a throw until the last one is in, then they all turn over together.
 */
export default function RpsRoom(props: RoomGameProps) {
  const { room, send } = props;
  const match = room.match!;
  const view = match.view as RpsView;
  const nameOf = useNames(room);
  const { onKeyDown, itemProps } = useRoving(POINTS);

  const playing = view.players.includes(room.you);
  const mine = playing ? (view.throws[room.you] ?? null) : null;
  const revealing = view.phase === 'reveal';
  const scoreOf = (id: string) => view.scores[view.players.indexOf(id)] ?? 0;

  const line = revealing
    ? view.last && view.last.winners.length > 0
      ? copy.rps.takes(view.last.winners.map(nameOf))
      : copy.rps.wash
    : !playing
      ? copy.room.watchingRound
      : mine
        ? copy.rps.thrown
        : copy.rps.pick;

  const onThrow = (t: Throw, el: HTMLElement) => {
    if (!playing || revealing || mine) return nudge(el);
    send({ t: 'move', move: { type: 'throw', choice: t } });
  };

  return (
    <OnlineFrame
      {...props}
      line={line}
      below={
        <p className="meta">{`${copy.rps.round(view.round)} · ${copy.rps.firstTo(view.target)}`}</p>
      }
      caption={(id) => {
        const ready = !revealing && view.throws[id] != null;
        return ready ? `${scoreOf(id)} · ${copy.rps.ready}` : String(scoreOf(id));
      }}
      captionLabel={(id, name) => copy.room.score(name, scoreOf(id))}
    >
      <div className="flex min-h-[224px] w-full max-w-[560px] items-center justify-center">
        {revealing && view.last ? (
          <ul className="flex flex-wrap items-start justify-center gap-x-8 gap-y-6">
            {view.players.map((id, i) => {
              const won = view.last!.winners.includes(id);
              const nobody = view.last!.winners.length === 0;
              return (
                <motion.li
                  key={id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: won || nobody ? 1 : 0.4, y: 0 }}
                  transition={{ ...settle, delay: i * 0.05, opacity: { duration: 0.24 } }}
                  className="flex flex-col items-center gap-3"
                >
                  <span
                    className={cx(
                      'grid size-24 place-items-center rounded-full border text-[15px]',
                      won ? 'border-accent text-ink' : 'border-hairline text-muted',
                    )}
                  >
                    {copy.rps[view.last!.throws[id]!]}
                  </span>
                  <span className="meta">{nameOf(id)}</span>
                </motion.li>
              );
            })}
          </ul>
        ) : (
          <div
            role="group"
            aria-label={copy.rps.throw}
            onKeyDown={onKeyDown}
            className="flex items-center justify-center gap-5 sm:gap-7"
          >
            {THROWS.map((t, i) => {
              const picked = mine === t;
              const open = playing && !mine;
              return (
                <button
                  key={t}
                  type="button"
                  {...itemProps(i)}
                  aria-pressed={picked}
                  aria-disabled={!open}
                  onClick={(e) => onThrow(t, e.currentTarget)}
                  className={cx(
                    'grid size-24 place-items-center rounded-full border text-[15px] select-none sm:size-28',
                    'transition-[border-color,color,opacity,transform] duration-200 ease-soft',
                    picked ? 'border-accent text-ink' : 'border-hairline',
                    open
                      ? 'cursor-pointer text-ink hover:-translate-y-0.5 hover:border-ink/20'
                      : 'cursor-default',
                    !open && !picked && 'text-muted opacity-40',
                  )}
                >
                  {copy.rps[t]}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </OnlineFrame>
  );
}

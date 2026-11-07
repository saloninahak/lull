import { useId, type ReactNode } from 'react';
import { motion } from 'motion/react';
import type { PlayerColor, PlayerShape } from '@lull/game-logic';
import { copy } from '../copy';
import { settle } from '../lib/motion';
import { cx } from '../lib/cx';
import { AvatarDot } from './AvatarDot';

export type SeatView = {
  id: string;
  name: string;
  color: PlayerColor;
  shape: PlayerShape;
  /** tiny mono line under the dot: a score, piece counts */
  caption?: ReactNode;
  /** what a screen reader hears for the caption */
  captionLabel?: string;
  /** dropped, with their seat held (readme 5.3) */
  away?: boolean;
};

type PlayerRowProps = {
  seats: readonly SeatView[];
  /** smaller dots and tighter spacing, so up to eight fit on a phone */
  compact?: boolean;
  /** whose turn it is. the soft ring eases over to them. */
  active?: string;
  /** when the game is over, everyone else dims */
  winners?: readonly string[];
};

/** the players as small dots. the turn ring slides between them (readme 3.5). */
export function PlayerRow({ seats, active, winners, compact = false }: PlayerRowProps) {
  const id = useId();
  return (
    <ul
      aria-label={copy.play.players}
      className={cx('flex items-start justify-center', compact ? 'gap-2.5' : 'gap-7')}
    >
      {seats.map((s) => {
        const isActive = s.id === active;
        const dim = winners !== undefined && winners.length > 0 && !winners.includes(s.id);
        return (
          <li key={s.id} className="flex flex-col items-center gap-2">
            <span className="relative grid place-items-center">
              {isActive ? (
                <motion.span
                  layoutId={`${id}-ring`}
                  transition={settle}
                  aria-hidden="true"
                  className={cx(
                    'absolute -inset-[5px] border-[1.5px] border-ink/25',
                    s.shape === 'circle' ? 'rounded-full' : 'rounded-[34%]',
                  )}
                />
              ) : null}
              <AvatarDot
                name={s.name}
                color={s.color}
                shape={s.shape}
                size={compact ? 'sm' : 'md'}
                away={dim || s.away === true}
              />
              {isActive ? <span className="sr-only">{copy.play.turn(s.name)}</span> : null}
            </span>
            {s.caption !== undefined ? (
              <span
                aria-label={s.captionLabel}
                className={cx(
                  'font-mono text-[11px] tracking-[0.02em] whitespace-nowrap text-muted tabular-nums',
                  'transition-opacity duration-200 ease-soft',
                  dim && 'opacity-50',
                )}
              >
                {s.caption}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

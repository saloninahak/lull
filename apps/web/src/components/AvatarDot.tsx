import type { PlayerColor, PlayerShape } from '@lull/game-logic';
import { cx } from '../lib/cx';

export type { PlayerColor, PlayerShape };

type AvatarDotProps = {
  name: string;
  color: PlayerColor;
  shape?: PlayerShape;
  size?: 'sm' | 'md' | 'lg';
  /** muted while a seat is held for someone reconnecting */
  away?: boolean;
  className?: string;
};

const sizes = {
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-[12px]',
  lg: 'size-10 text-[14px]',
} as const;

/**
 * a simple colored dot with the player's initial, so color is never the
 * only signal.
 */
export function AvatarDot({
  name,
  color,
  shape = 'circle',
  size = 'md',
  away = false,
  className,
}: AvatarDotProps) {
  const initial = Array.from(name.trim())[0]?.toLowerCase() ?? '?';
  return (
    <span
      role="img"
      aria-label={name}
      className={cx(
        'inline-grid shrink-0 place-items-center font-mono font-medium leading-none select-none',
        'transition-opacity duration-200 ease-soft',
        shape === 'circle' ? 'rounded-full' : 'rounded-[30%]',
        sizes[size],
        away && 'opacity-40',
        className,
      )}
      style={{ backgroundColor: `var(--${color})`, color: `var(--on-${color})` }}
    >
      <span aria-hidden="true">{initial}</span>
    </span>
  );
}

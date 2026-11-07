import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';

type Variant = 'solid' | 'quiet' | 'ghost';

type PillButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  /** optional leading icon */
  icon?: ReactNode;
};

const variants: Record<Variant, string> = {
  // the one strong action on a screen
  solid: 'bg-ink text-paper hover:bg-ink/85',
  // secondary, sits on a surface
  quiet: 'bg-surface text-ink border border-hairline hover:bg-paper-soft',
  // almost nothing until hovered
  ghost: 'text-muted hover:text-ink hover:bg-paper-soft',
};

/**
 * soft pill. 44px tall so it is always a comfortable thumb target.
 */
export function PillButton({
  variant = 'solid',
  icon,
  className,
  children,
  type = 'button',
  ...rest
}: PillButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex h-11 items-center justify-center gap-2 rounded-pill px-5',
        'text-sm font-medium tracking-[-0.005em] whitespace-nowrap select-none',
        'transition-[background-color,color,transform] duration-200 ease-soft',
        'motion-safe:active:scale-[0.98]',
        'disabled:pointer-events-none disabled:opacity-40',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {icon ? <span className="text-[16px] leading-none">{icon}</span> : null}
      {children}
    </button>
  );
}

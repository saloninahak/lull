import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';

type DockProps = {
  /** accessible name for the group of actions */
  label: string;
  children: ReactNode;
};

/**
 * floating pill at the bottom center. holds a few actions, nothing else.
 * respects the phone's home indicator via the safe-area inset.
 */
export function Dock({ label, children }: DockProps) {
  return (
    <nav
      aria-label={label}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(16px,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-pill border border-hairline bg-surface p-1 shadow-calm">
        {children}
      </div>
    </nav>
  );
}

type DockButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** icon-only items need a label; text items use their text */
  label?: string;
  /** the one stronger item in the dock */
  emphasis?: boolean;
  /** a toggle that is on: a soft tint, so it never competes with the strong pill */
  pressed?: boolean;
};

/** a dock item that switches something on and off (reported with aria-pressed) */
export function DockToggle({
  pressed,
  ...rest
}: Omit<DockButtonProps, 'emphasis' | 'pressed'> & { pressed: boolean }) {
  return <DockButton pressed={pressed} aria-pressed={pressed} {...rest} />;
}

export function DockButton({
  label,
  emphasis = false,
  pressed = false,
  className,
  children,
  type = 'button',
  ...rest
}: DockButtonProps) {
  const iconOnly = Boolean(label);
  return (
    <button
      type={type}
      aria-label={label}
      className={cx(
        'inline-flex h-11 items-center justify-center rounded-pill select-none',
        'transition-[background-color,color,transform] duration-200 ease-soft',
        'motion-safe:active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-40',
        iconOnly
          ? 'w-11 text-[17px]'
          : 'px-4 text-sm font-medium tracking-[-0.005em] whitespace-nowrap',
        emphasis
          ? 'bg-ink text-paper hover:bg-ink/85'
          : pressed
            ? 'bg-ink/[0.07] text-ink hover:bg-ink/[0.1]'
            : 'text-muted hover:bg-paper-soft hover:text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

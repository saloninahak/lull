import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';

type GhostIconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** accessible name. the icon itself is decorative. */
  label: string;
  children: ReactNode;
  /** hairline ring around the circle. off inside the dock. */
  bordered?: boolean;
};

/**
 * small circular ghost button. the visible circle is 36px; the button
 * itself is 44px so the tap target stays comfortable.
 */
export function GhostIconButton({
  label,
  children,
  bordered = true,
  className,
  type = 'button',
  ...rest
}: GhostIconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cx(
        'group inline-grid size-11 shrink-0 place-items-center rounded-full select-none',
        'disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      <span
        className={cx(
          'grid size-9 place-items-center rounded-full text-[16px] text-muted',
          'transition-[background-color,color,transform] duration-200 ease-soft',
          'group-hover:bg-paper-soft group-hover:text-ink',
          'motion-safe:group-active:scale-95',
          bordered && 'border border-hairline bg-surface',
        )}
      >
        {children}
      </span>
    </button>
  );
}

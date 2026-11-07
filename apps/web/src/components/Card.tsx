import type { HTMLAttributes } from 'react';
import { cx } from '../lib/cx';
import type { Accent } from '../lib/accent';

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'article' | 'section';
  /** the card's own accent, used for its small details and focus ring */
  accent?: Accent;
  /** lift slightly on hover */
  lift?: boolean;
};

/**
 * rounded surface. hairline border and a very soft shadow, never a heavy one.
 */
export function Card({ as: Tag = 'div', accent, lift = false, className, ...rest }: CardProps) {
  return (
    <Tag
      data-accent={accent}
      className={cx(
        'relative rounded-lg border border-hairline bg-surface shadow-calm',
        lift &&
          'transition-[transform,box-shadow] duration-[240ms] ease-soft hover:shadow-lift motion-safe:hover:-translate-y-0.5',
        className,
      )}
      {...rest}
    />
  );
}

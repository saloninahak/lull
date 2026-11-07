import { useId } from 'react';
import { motion } from 'motion/react';
import { cx } from '../lib/cx';
import { settle } from '../lib/motion';

type Option<T> = { value: T; label: string };

type SegmentedProps<T extends string | number> = {
  label: string;
  options: ReadonlyArray<Option<T>>;
  value: T;
  onChange: (value: T) => void;
};

/**
 * a small pill of choices (board size, players). the soft highlight slides
 * to the chosen one, so the change is felt. 44px tall for thumbs.
 */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  const id = useId();
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex h-11 items-center rounded-pill border border-hairline bg-surface p-[3px]"
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cx(
              'relative h-full min-w-11 rounded-pill px-3 font-mono text-[12px] tracking-[0.02em] select-none',
              'transition-colors duration-200 ease-soft',
              on ? 'text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {on ? (
              <motion.span
                layoutId={`${id}-on`}
                transition={settle}
                className="absolute inset-0 rounded-pill bg-ink/[0.07]"
                aria-hidden="true"
              />
            ) : null}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

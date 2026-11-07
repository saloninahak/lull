import { useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { GOAL, LETTERS, LINES } from '@lull/game-logic';
import { copy } from '../../copy';
import { cx } from '../../lib/cx';
import { drawIn, softSettle, stroke } from '../../lib/motion';
import { useRoving } from '../../lib/roving';

/** the card is drawn in a fixed 300-unit space, 60 per cell */
const UNITS = 300;
const CELL = UNITS / 5;

const POINTS = Array.from({ length: 25 }, (_, i) => [i % 5, Math.floor(i / 5)] as const);

const GRID_LINES = (() => {
  const inset = CELL * 0.08;
  const out: string[] = [];
  for (let k = 1; k < 5; k++) {
    out.push(`M ${k * CELL} ${inset} V ${UNITS - inset}`);
    out.push(`M ${inset} ${k * CELL} H ${UNITS - inset}`);
  }
  return out;
})();

/** a line through the middle of five cells, reaching a little past each end */
function strikePath(line: readonly number[]): string {
  const center = (i: number) => [((i % 5) + 0.5) * CELL, (Math.floor(i / 5) + 0.5) * CELL];
  const [x1, y1] = center(line[0]!) as [number, number];
  const [x2, y2] = center(line[4]!) as [number, number];
  const ext = 0.3 / 4;
  return `M ${x1 - (x2 - x1) * ext} ${y1 - (y2 - y1) * ext} L ${x2 + (x2 - x1) * ext} ${y2 + (y2 - y1) * ext}`;
}

/** the size every bingo surface shares, so the cover sits exactly over the card */
export const CARD_SIZE = 'w-[min(calc(100vw_-_48px),calc(100dvh_-_540px),400px)] min-w-[264px]';

type BingoCardProps = {
  card: readonly number[];
  called: readonly number[];
  /** completed lines, in the order they were made */
  lines: readonly number[];
  /** lines the last call completed, which draw in */
  newLines: readonly number[];
  /** the number just called, whose dot lands */
  lastNumber: number | null;
  interactive: boolean;
  onNumber: (n: number, el: HTMLElement) => void;
};

/**
 * a notebook card: b-i-n-g-o across the top, 1 to 25 in a hairline grid.
 * a called number gets a calm green dot, a full line gets a thin stroke
 * through it, and each line crosses off the next letter.
 */
export function BingoCard({
  card,
  called,
  lines,
  newLines,
  lastNumber,
  interactive,
  onNumber,
}: BingoCardProps) {
  const reduce = useReducedMotion();
  const crossed = useMemo(() => new Set(called), [called]);
  const { onKeyDown, itemProps } = useRoving(POINTS);
  const letters = Math.min(lines.length, GOAL);
  const freshFrom = letters - Math.min(newLines.length, letters);

  return (
    <div className="flex flex-col items-center">
      {/* the letters, crossed off one per line */}
      <div
        className={cx('grid grid-cols-5', CARD_SIZE)}
        aria-label={copy.bingo.letters(letters)}
        role="img"
      >
        {LETTERS.map((letter, i) => {
          const done = i < letters;
          return (
            <span
              key={letter}
              aria-hidden="true"
              className="relative mx-auto mb-2 flex h-7 w-6 items-center justify-center font-mono text-[13px] tracking-[0.04em]"
            >
              <span
                className={cx('transition-colors duration-300', done ? 'text-ink' : 'text-muted')}
              >
                {letter}
              </span>
              {done ? (
                <motion.span
                  className="absolute inset-x-0 top-1/2 h-[1.5px] origin-left rounded-full bg-green"
                  initial={i >= freshFrom ? (reduce ? { opacity: 0 } : { scaleX: 0 }) : false}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 0.28, delay: 0.42, ease: [0.33, 0, 0.2, 1] }}
                />
              ) : null}
            </span>
          );
        })}
      </div>

      <div className={cx('relative aspect-square', CARD_SIZE)}>
        <svg
          viewBox={`0 0 ${UNITS} ${UNITS}`}
          className="pointer-events-none absolute inset-0 size-full overflow-visible"
          aria-hidden="true"
          focusable="false"
        >
          <g fill="none" strokeLinecap="round" className="stroke-faint" strokeWidth={1}>
            {GRID_LINES.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <g
            fill="none"
            strokeLinecap="round"
            stroke="var(--green)"
            strokeWidth={1.5}
            opacity={0.5}
          >
            {lines.map((l) =>
              newLines.includes(l) ? (
                <motion.path
                  key={l}
                  d={strikePath(LINES[l]!)}
                  {...drawIn(reduce, stroke(0.32, 0.16))}
                />
              ) : (
                <path key={l} d={strikePath(LINES[l]!)} />
              ),
            )}
          </g>
        </svg>

        <div
          role="group"
          aria-label={copy.bingo.card}
          onKeyDown={onKeyDown}
          className="absolute inset-0 grid grid-cols-5"
        >
          {card.map((n, i) => {
            const isCrossed = crossed.has(n);
            return (
              <button
                key={n}
                type="button"
                {...itemProps(i)}
                aria-label={copy.bingo.cell(n, isCrossed)}
                aria-disabled={!interactive || isCrossed}
                onClick={(e) => interactive && onNumber(n, e.currentTarget)}
                className={cx(
                  'relative grid place-items-center rounded-md outline-offset-[-8px] select-none',
                  interactive && !isCrossed ? 'cursor-pointer' : 'cursor-default',
                  interactive && !isCrossed && 'transition-colors duration-200 hover:bg-ink/[0.03]',
                )}
              >
                {isCrossed ? (
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-[24%] rounded-full bg-green/20"
                    initial={n === lastNumber ? { scale: 0.3, opacity: 0 } : false}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ ...softSettle, opacity: { duration: 0.18 } }}
                  />
                ) : null}
                <span className="relative font-mono text-[17px] tracking-[0.01em] tabular-nums">
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** the number just called, large in the serif, with a gentle flip (readme 3.5) */
export function CalledNumber({ number, sub }: { number: number; sub: string }) {
  return (
    <div className="relative flex h-[76px] w-full flex-col items-center justify-center [perspective:400px]">
      <p className="sr-only" aria-live="polite">
        {`${number}, ${sub}`}
      </p>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={number}
          aria-hidden="true"
          className="display block text-[44px] tabular-nums"
          style={{ transformOrigin: '50% 60%' }}
          initial={{ rotateX: -80, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 80, opacity: 0, transition: { duration: 0.16 } }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          {number}
        </motion.span>
      </AnimatePresence>
      <span aria-hidden="true" className="meta mt-1">
        {sub}
      </span>
    </div>
  );
}

/** five tiny letters under a player's dot, the crossed ones in ink */
export function LetterCaption({ lines }: { lines: number }) {
  return (
    <span className="flex gap-[1px]">
      {LETTERS.map((l, i) => (
        <span key={l} className={i < lines ? 'text-ink' : 'text-muted opacity-60'}>
          {l}
        </span>
      ))}
    </span>
  );
}

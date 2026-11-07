import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { MISSES } from '@lull/game-logic';
import { copy } from '../../copy';
import { cx } from '../../lib/cx';
import { drawIn, settle, stroke } from '../../lib/motion';

const ALPHABET = [...'abcdefghijklmnopqrstuvwxyz'];

/** the figure, one stroke per miss, in the order it's drawn on paper */
const PARTS = [
  'M 70 34 m -9 0 a 9 9 0 1 0 18 0 a 9 9 0 1 0 -18 0', // head
  'M 70 43 V 70', // body
  'M 70 50 L 58 61', // left arm
  'M 70 50 L 82 61', // right arm
  'M 70 70 L 60 86', // left leg
  'M 70 70 L 80 86', // right leg
];

type BoardProps = {
  misses: number;
  /** the word as this player sees it: found letters, and null for blanks */
  mask: ReadonlyArray<string | null>;
  guessed: readonly string[];
  /** whether this player may guess right now */
  canGuess: boolean;
  onGuess: (letter: string, el: Element | null) => void;
};

/**
 * the gallows, the word in blanks, and the letters. a letter can also be
 * typed on the keyboard while it's your go. used alone and in a room.
 */
export function HangmanBoard({ misses, mask, guessed, canGuess, onGuess }: BoardProps) {
  const reduce = useReducedMotion();

  // typing a letter guesses it, when it's your go
  const guessRef = useRef(onGuess);
  useEffect(() => {
    guessRef.current = onGuess;
  });
  useEffect(() => {
    if (!canGuess) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement | null)?.closest('input, textarea')) return;
      const letter = e.key.toLowerCase();
      if (letter.length === 1 && ALPHABET.includes(letter)) {
        e.preventDefault();
        guessRef.current(letter, document.querySelector(`[data-letter="${letter}"]`));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canGuess]);

  return (
    <div className="flex w-full max-w-[620px] flex-col items-center">
      <svg
        viewBox="0 0 100 100"
        className="h-[min(150px,calc(100dvh_-_560px))] min-h-[96px] w-auto"
        aria-label={copy.hangman.misses(misses, MISSES)}
        role="img"
      >
        <path
          d="M 16 92 H 52 M 28 92 V 12 H 70 V 25"
          fill="none"
          className="stroke-faint"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {PARTS.slice(0, misses).map((d) => (
          <motion.path
            key={d}
            d={d}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinecap="round"
            {...drawIn(reduce, stroke(0.28))}
          />
        ))}
      </svg>

      <p className="sr-only" aria-live="polite">
        {mask.map((l) => l ?? 'blank').join(' ')}
      </p>
      <div aria-hidden="true" className="mt-6 flex flex-wrap justify-center gap-2.5">
        {mask.map((l, i) => {
          const found = l !== null && guessed.includes(l);
          return (
            <span key={i} className="flex w-7 flex-col items-center gap-1.5">
              <span className="flex h-8 items-end">
                {l ? (
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={settle}
                    className={cx(
                      'font-mono text-[24px] leading-none',
                      found ? 'text-ink' : 'text-muted',
                    )}
                  >
                    {l}
                  </motion.span>
                ) : null}
              </span>
              <span className="h-[1.5px] w-full rounded-full bg-ink/25" />
            </span>
          );
        })}
      </div>

      <div
        role="group"
        aria-label={copy.hangman.letters}
        className="mt-8 flex max-w-[600px] flex-wrap justify-center gap-1"
      >
        {ALPHABET.map((l) => {
          const used = guessed.includes(l);
          const hit = used && mask.includes(l);
          const open = canGuess && !used;
          return (
            <button
              key={l}
              type="button"
              data-letter={l}
              aria-label={copy.hangman.letter(l, !used ? 'open' : hit ? 'hit' : 'miss')}
              aria-disabled={!open}
              onClick={(e) => onGuess(l, e.currentTarget)}
              className={cx(
                'grid size-11 place-items-center rounded-full font-mono text-[15px] select-none',
                'transition-colors duration-200 ease-soft',
                hit && 'bg-accent/15 text-ink',
                used && !hit && 'text-faint line-through',
                !used &&
                  (open
                    ? 'cursor-pointer text-ink hover:bg-paper-soft'
                    : 'cursor-default text-muted'),
              )}
            >
              {l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

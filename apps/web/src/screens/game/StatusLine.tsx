import { AnimatePresence, motion } from 'motion/react';
import { reveal } from '../../lib/motion';

type StatusLineProps = {
  /** the line itself: "x's turn", or the result */
  text: string;
  /** a small muted line beneath, for results ("good game.") */
  sub?: string;
  /** a result gets the serif, everything else stays small */
  big?: boolean;
};

/**
 * one quiet line about what is happening. results get the serif moment.
 * fixed height, so nothing below it ever jumps.
 */
export function StatusLine({ text, sub, big = false }: StatusLineProps) {
  const key = `${big ? 'big' : 'small'}:${text}`;
  return (
    <div className="relative flex h-[76px] w-full items-center justify-center text-center">
      {/* screen readers hear a plain, polite announcement */}
      <p className="sr-only" aria-live="polite">
        {sub ? `${text}. ${sub}` : text}
      </p>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={key}
          aria-hidden="true"
          initial={{ opacity: 0, y: big ? 6 : 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={big ? { ...reveal, duration: 0.4, delay: 0.35 } : reveal}
          className="absolute inset-x-0 flex flex-col items-center"
        >
          {big ? (
            <>
              <span className="display text-[40px]">{text}</span>
              {sub ? <span className="meta mt-2">{sub}</span> : null}
            </>
          ) : (
            <span className="text-sm tracking-[-0.005em]">{text}</span>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

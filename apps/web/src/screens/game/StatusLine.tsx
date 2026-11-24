import { createContext, useContext, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { reveal } from '../../lib/motion';

/**
 * true while it is this player's turn in a room. the status line and the
 * clock line read it, so "your turn" can be the loudest thing on screen
 * without every game having to say so.
 */
export const MyTurn = createContext(false);

/**
 * the line that tells you what is going on. it is the one piece of text
 * people must not miss, so it is large and in full ink. on your own turn it
 * becomes a solid pill, the strongest mark on the screen.
 */
export function TurnText({ children, mine }: { children: ReactNode; mine: boolean }) {
  return mine ? (
    <span className="inline-flex max-w-full items-center rounded-lg bg-ink px-5 py-2.5 text-[18px] leading-snug font-medium tracking-[-0.01em] text-paper">
      {children}
    </span>
  ) : (
    <span className="inline-flex max-w-full items-center gap-2.5 text-[19px] leading-snug font-medium tracking-[-0.01em] text-ink">
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent" />
      {children}
    </span>
  );
}

type StatusLineProps = {
  /** the line itself: "x's turn", or the result */
  text: string;
  /** a small muted line beneath, for results ("good game.") or what to do next */
  sub?: string;
  /** a result gets the serif, everything else stays one clear line */
  big?: boolean;
};

/**
 * one clear line about what is happening. results get the serif moment.
 * fixed height, so nothing below it ever jumps.
 */
export function StatusLine({ text, sub, big = false }: StatusLineProps) {
  const mine = useContext(MyTurn);
  const key = `${big ? 'big' : 'small'}:${mine ? 'mine' : 'theirs'}:${text}`;
  return (
    <div className="relative flex h-[84px] w-full items-center justify-center text-center">
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
            <>
              <TurnText mine={mine}>{text}</TurnText>
              {sub ? <span className="mt-1.5 text-[14px] text-muted">{sub}</span> : null}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

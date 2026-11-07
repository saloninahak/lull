import type { Transition } from 'motion/react';

/** the shared feel (readme 3.5). keep every screen on these. */

/** settles: a piece landing, a box filling */
export const settle: Transition = { type: 'spring', stiffness: 260, damping: 28 };

/** a settle with a touch more give, for the box fill's tiny overshoot */
export const softSettle: Transition = { type: 'spring', stiffness: 260, damping: 18 };

/** reveals and hovers */
export const reveal: Transition = { duration: 0.24, ease: [0.22, 1, 0.36, 1] };

/** pencil strokes: lines and marks drawing themselves */
export const stroke = (duration = 0.2, delay = 0): Transition => ({
  duration,
  delay,
  ease: [0.33, 0, 0.2, 1],
});

/**
 * a path that draws itself, or simply fades in when reduced motion is on.
 * use as {...drawIn(reduce, transition)} on a motion svg element.
 */
export function drawIn(reduce: boolean | null, transition: Transition) {
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.18 },
    };
  }
  return {
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { ...transition, opacity: { duration: 0.01, delay: transition.delay ?? 0 } },
  };
}

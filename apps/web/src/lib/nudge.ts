/**
 * the quiet "not here" for a rejected move (readme 5.3): a tiny opacity
 * pulse. no shake, no message. opacity only, so it is fine with reduced motion.
 */
export function nudge(el: Element | null | undefined): void {
  if (!el || typeof el.animate !== 'function') return;
  el.animate([{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }], {
    duration: 320,
    easing: 'ease-out',
  });
}

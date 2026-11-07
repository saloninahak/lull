import { useCallback, useRef, useState, type KeyboardEvent } from 'react';

/**
 * arrow-key focus across a board (cells, edges or points). only one item
 * is in the tab order; arrows move to the nearest item in that direction.
 * works for grids and for irregular boards like morris.
 */

type Point = readonly [number, number];

const DIRS: Record<string, Point> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1],
};

export function nearestInDirection(points: readonly Point[], from: number, key: string): number {
  const dir = DIRS[key];
  const origin = points[from];
  if (!dir || !origin) return from;
  let best = from;
  let bestScore = Infinity;
  points.forEach(([x, y], i) => {
    if (i === from) return;
    const dx = x - origin[0];
    const dy = y - origin[1];
    const along = dx * dir[0] + dy * dir[1];
    if (along <= 0.001) return;
    const across = Math.abs(dx * dir[1] - dy * dir[0]);
    // prefer straight ahead, then close by
    const score = along + across * 2.5;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

export function useRoving(points: readonly Point[]) {
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLElement | SVGElement | null>>([]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!(e.key in DIRS)) return;
      e.preventDefault();
      const next = nearestInDirection(points, active, e.key);
      setActive(next);
      refs.current[next]?.focus();
    },
    [points, active],
  );

  /** props for item i */
  const itemProps = useCallback(
    (i: number) => ({
      tabIndex: i === active ? 0 : -1,
      ref: (el: HTMLElement | SVGElement | null) => {
        refs.current[i] = el;
      },
      onFocus: () => setActive(i),
    }),
    [active],
  );

  return { onKeyDown, itemProps };
}

/** true when focus came from the keyboard, so rings only show for keyboard users */
export function isKeyboardFocus(el: Element): boolean {
  try {
    return el.matches(':focus-visible');
  } catch {
    return true;
  }
}

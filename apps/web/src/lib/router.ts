import { useSyncExternalStore } from 'react';

/**
 * a few lines of routing on the history api. there are only a handful of
 * screens, so a router library would add more than it gives.
 *
 * each entry this app pushes carries its depth, so `back()` knows whether
 * there's a page of ours to go back to, or whether to go home instead
 * (a shared room link opened straight in a new tab, say).
 */

type Entry = { depth: number };

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

function subscribe(fn: () => void) {
  listeners.add(fn);
  window.addEventListener('popstate', fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('popstate', fn);
  };
}

const depth = () => (window.history.state as Entry | null)?.depth ?? 0;

/**
 * go to a path. `replace` swaps the current page instead of adding one,
 * for steps you shouldn't land on again with back (the start-a-room form
 * once the room exists).
 */
export function navigate(path: string, { replace = false } = {}): void {
  const here = window.location.pathname + window.location.search;
  if (path === here) return;
  const entry: Entry = { depth: replace ? depth() : depth() + 1 };
  if (replace) window.history.replaceState(entry, '', path);
  else window.history.pushState(entry, '', path);
  window.scrollTo(0, 0);
  notify();
}

/** one page back within the app, or home when this is the first page */
export function back(): void {
  if (depth() > 0) window.history.back();
  else navigate('/', { replace: true });
}

export function usePath(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => '/',
  );
}

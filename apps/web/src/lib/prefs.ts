import { useSyncExternalStore } from 'react';

/**
 * tiny local preferences. localStorage only (readme section 6: name, theme,
 * sound, player id). every read and write is guarded so private mode or a
 * full quota never breaks the app.
 */

export type Theme = 'light' | 'dark';

const KEYS = {
  theme: 'lull:theme',
  /** sound effects. the key predates the music setting, so it keeps its name. */
  sound: 'lull:sound',
  music: 'lull:music',
  order: 'lull:order',
  pins: 'lull:pins',
} as const;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage can be unavailable. the setting still applies for this visit.
  }
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/* theme ------------------------------------------------------------------ */

function getTheme(): Theme {
  // the inline script in index.html has already applied the stored theme
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#0a0a0a' : '#ffffff');
  write(KEYS.theme, theme);
  emit();
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => 'light');
}

/* sound effects and music: two separate switches, both on by default --------- */

let sfxOn = read(KEYS.sound) !== 'off';
// someone who had turned the old single sound switch off gets quiet music too
let musicOn = read(KEYS.music) === null ? sfxOn : read(KEYS.music) !== 'off';

export function setSfx(on: boolean): void {
  sfxOn = on;
  write(KEYS.sound, on ? 'on' : 'off');
  emit();
}

/** the current setting, for non-react code (the sound player) */
export function isSfxOn(): boolean {
  return sfxOn;
}

export function useSfx(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => sfxOn,
    () => false,
  );
}

export function setMusic(on: boolean): void {
  musicOn = on;
  write(KEYS.music, on ? 'on' : 'off');
  emit();
}

export function isMusicOn(): boolean {
  return musicOn;
}

export function useMusic(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => musicOn,
    () => false,
  );
}

/* home layout: the order of the cards, and the pinned ones ------------------- */

export type Layout = { order: readonly string[]; pins: readonly string[] };

function readList(key: string): string[] {
  try {
    const value: unknown = JSON.parse(read(key) ?? '[]');
    return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

// one object, replaced on every change, so react sees a stable snapshot
let layout: Layout = { order: readList(KEYS.order), pins: readList(KEYS.pins) };
const EMPTY_LAYOUT: Layout = { order: [], pins: [] };

export function setLayout(next: Layout): void {
  layout = { order: [...next.order], pins: [...next.pins] };
  write(KEYS.order, JSON.stringify(layout.order));
  write(KEYS.pins, JSON.stringify(layout.pins));
  emit();
}

export function useLayout(): Layout {
  return useSyncExternalStore(
    subscribe,
    () => layout,
    () => EMPTY_LAYOUT,
  );
}

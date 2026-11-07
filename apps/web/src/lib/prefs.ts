import { useSyncExternalStore } from 'react';

/**
 * tiny local preferences. localStorage only (readme section 6: name, theme,
 * sound, player id). every read and write is guarded so private mode or a
 * full quota never breaks the app.
 */

export type Theme = 'light' | 'dark';

const KEYS = {
  theme: 'lull:theme',
  sound: 'lull:sound',
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

/* sound (off by default) --------------------------------------------------- */

let soundOn = read(KEYS.sound) === 'on' || read(KEYS.sound) === null; // on by default

export function setSound(on: boolean): void {
  soundOn = on;
  write(KEYS.sound, on ? 'on' : 'off');
  emit();
}

/** the current setting, for non-react code (the sound player) */
export function isSoundOn(): boolean {
  return soundOn;
}

export function useSound(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => soundOn,
    () => false,
  );
}

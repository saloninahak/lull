import { copy } from '../copy';
import { startMusic, stopMusic } from '../lib/music';
import { setMusic, setSfx, setTheme, useMusic, useSfx, useTheme } from '../lib/prefs';
import { play, primeSound } from '../lib/sound';
import { GhostIconButton } from './GhostIconButton';
import { MoonIcon, MusicIcon, SpeakerIcon, SunIcon } from './icons';

export function ThemeToggle() {
  const theme = useTheme();
  const dark = theme === 'dark';
  return (
    <GhostIconButton
      label={copy.controls.darkTheme}
      title={copy.controls.darkTheme}
      aria-pressed={dark}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </GhostIconButton>
  );
}

/** the background music. on and off fade, never cut. */
export function MusicToggle() {
  const on = useMusic();
  const toggle = () => {
    const next = !on;
    setMusic(next);
    if (next) startMusic();
    else stopMusic();
  };
  return (
    <GhostIconButton
      label={copy.controls.music}
      title={on ? copy.controls.musicOff : copy.controls.musicOn}
      aria-pressed={on}
      onClick={toggle}
    >
      <MusicIcon on={on} />
    </GhostIconButton>
  );
}

/** the small sounds of play. turning them on plays one, so you hear the choice. */
export function SfxToggle() {
  const on = useSfx();
  const toggle = () => {
    const next = !on;
    setSfx(next);
    if (next) {
      primeSound();
      play('turn');
    }
  };
  return (
    <GhostIconButton
      label={copy.controls.sfx}
      title={on ? copy.controls.sfxOff : copy.controls.sfxOn}
      aria-pressed={on}
      onClick={toggle}
    >
      <SpeakerIcon on={on} />
    </GhostIconButton>
  );
}

/** the small circles that sit top-right on every screen */
export function Controls() {
  return (
    <div role="group" aria-label={copy.controls.label} className="flex items-center gap-0.5">
      <ThemeToggle />
      <MusicToggle />
      <SfxToggle />
    </div>
  );
}

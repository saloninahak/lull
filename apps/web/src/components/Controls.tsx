import { copy } from '../copy';
import { setSound, setTheme, useSound, useTheme } from '../lib/prefs';
import { play, primeSound } from '../lib/sound';
import { toggleMusic } from '../lib/music';
import { GhostIconButton } from './GhostIconButton';
import { MoonIcon, SpeakerIcon, SunIcon } from './icons';

export function ThemeToggle() {
  const theme = useTheme();
  const dark = theme === 'dark';
  return (
    <GhostIconButton
      label={copy.controls.darkTheme}
      aria-pressed={dark}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </GhostIconButton>
  );
}

export function SoundToggle() {
  const on = useSound();
  const toggle = () => {
    const next = !on;
    setSound(next);
    primeSound();
    if (next) {
      play('turn');
      toggleMusic(true);
    } else {
      toggleMusic(false);
    }
  };
  return (
    <GhostIconButton label={copy.controls.sound} aria-pressed={on} onClick={toggle}>
      <SpeakerIcon on={on} />
    </GhostIconButton>
  );
}

/** the two small circles that sit top-right on every screen */
export function Controls() {
  return (
    <div role="group" aria-label={copy.controls.label} className="flex items-center gap-0.5">
      <ThemeToggle />
      <SoundToggle />
    </div>
  );
}

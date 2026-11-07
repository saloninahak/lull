import { copy } from '../copy';
import { setSound, useSound } from '../lib/prefs';
import { primeSound, play } from '../lib/sound';
import { cx } from '../lib/cx';
import { SpeakerIcon } from './icons';

/** tiny muted sign-off, and a tiny speaker pill that shows and toggles sound */
export function Footer({ className }: { className?: string }) {
  const on = useSound();
  const toggle = () => {
    const next = !on;
    setSound(next);
    if (next) {
      primeSound();
      play('turn');
    }
  };
  return (
    <footer className={cx('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between gap-4">
        <p className="meta">{copy.footer.signoff}</p>
        <button
          type="button"
          aria-pressed={on}
          onClick={toggle}
          className={cx(
            'meta -my-2 -mr-3 inline-flex h-11 items-center gap-1.5 rounded-pill px-3',
            'transition-colors duration-200 ease-soft hover:text-ink',
          )}
        >
          <span className="text-[14px] leading-none">
            <SpeakerIcon on={on} />
          </span>
          {copy.footer.sound}
        </button>
      </div>
      <p className="meta" style={{ letterSpacing: '0.01em' }}>
        built by{' '}
        <a
          href="https://saloninahak.framer.website"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors duration-200 ease-soft hover:text-ink"
        >
          @saloninahak
        </a>
        {' '}· with love, boredom and AI
      </p>
    </footer>
  );
}

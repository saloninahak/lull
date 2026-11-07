import { copy } from '../copy';
import { cx } from '../lib/cx';

/** the tiny sign-off and the credit, side by side, wrapping on small screens */
export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cx('flex flex-wrap items-center justify-between gap-x-6 gap-y-2', className)}>
      <p className="meta">{copy.footer.signoff}</p>
      <p className="meta">
        {copy.footer.builtBy}{' '}
        <a
          href="https://saloninahak.framer.website"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-soft hover:text-ink hover:decoration-current"
        >
          @saloninahak
        </a>{' '}
        {copy.footer.withLove}
      </p>
    </footer>
  );
}

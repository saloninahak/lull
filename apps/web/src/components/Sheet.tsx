import { useEffect, useId, useRef, type ReactNode } from 'react';
import { copy } from '../copy';
import { PillButton } from './PillButton';

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/**
 * a small card over the page, for a few lines of reading: how to play,
 * how it works. a native dialog, so focus stays inside, escape closes it,
 * and a click outside closes it too.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClose={onClose}
      onClick={(e) => {
        // the dialog itself is only hit outside the card
        if (e.target === ref.current) onClose();
      }}
      className="sheet m-auto w-[min(calc(100vw_-_32px),460px)] rounded-lg border border-hairline bg-surface p-0 text-ink shadow-lift"
    >
      {/* only in the page while open, so closed sheets never add hidden text */}
      {open ? (
        <div className="px-7 pt-7 pb-6 sm:px-8 sm:pt-8">
          <h2 id={id} className="display text-[30px]">
            {title}
          </h2>
          <div className="mt-5">{children}</div>
          <div className="mt-7 flex justify-end">
            <PillButton variant="quiet" onClick={onClose}>
              {copy.sheet.done}
            </PillButton>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

/** a few short lines, each its own quiet paragraph */
export function Lines({ lines }: { lines: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {lines.map((line) => (
        <li key={line} className="flex gap-3 text-[14px] leading-relaxed text-ink">
          <span aria-hidden="true" className="mt-[0.6em] size-1 shrink-0 rounded-full bg-accent" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

import type { ReactNode } from 'react';
import { Card } from '../../components/Card';
import { GhostIconButton } from '../../components/GhostIconButton';
import { ArrowIcon } from '../../components/icons';
import type { Accent } from '../../lib/accent';
import { copy } from '../../copy';
import { cx } from '../../lib/cx';

type GameCardProps = {
  title: string;
  line: string;
  accent: Accent;
  preview: ReactNode;
  /** absent when the game cannot be opened in the current mode */
  onOpen?: () => void;
};

/**
 * one game on the home grid. the whole card is the arrow button's hit area,
 * so it is easy to tap and has a single, clear name for screen readers.
 */
export function GameCard({ title, line, accent, preview, onOpen }: GameCardProps) {
  const open = onOpen !== undefined;
  return (
    <Card as="article" accent={accent} lift={open} className="flex h-full flex-col p-2">
      <div
        className={cx(
          'flex flex-1 items-center justify-center rounded-md bg-paper-soft py-6',
          'min-h-[144px] sm:min-h-[176px]',
          'transition-opacity duration-200 ease-soft',
          !open && 'opacity-60',
        )}
      >
        {preview}
      </div>
      <div className="flex items-end justify-between gap-3 px-3 pt-4 pb-2">
        <div className="min-w-0">
          <h3 className="text-[15px] font-medium tracking-[-0.01em]">{title}</h3>
          <p className="meta mt-0.5">{line}</p>
        </div>
        <GhostIconButton
          label={copy.card.open(title)}
          onClick={onOpen}
          disabled={!open}
          className="-mr-1 -mb-1 after:absolute after:inset-0 after:rounded-lg after:content-['']"
        >
          <ArrowIcon />
        </GhostIconButton>
      </div>
    </Card>
  );
}

import type { MouseEvent, ReactNode } from 'react';
import { Card } from '../../components/Card';
import { GhostIconButton } from '../../components/GhostIconButton';
import { ArrowIcon, PinIcon } from '../../components/icons';
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
  pinned: boolean;
  onPin: () => void;
};

/**
 * one game on the home grid. every card is the same size: the preview has a
 * fixed height, and the card fills its grid cell. clicking anywhere opens
 * the game; the arrow is the same thing for the keyboard. the pin keeps a
 * favourite at the top.
 */
export function GameCard({ title, line, accent, preview, onOpen, pinned, onPin }: GameCardProps) {
  const open = onOpen !== undefined;
  // the whole card opens the game, except its own two buttons
  const onCardClick = (e: MouseEvent) => {
    if (!open || (e.target as Element).closest('button')) return;
    onOpen();
  };
  return (
    <Card
      as="article"
      accent={accent}
      lift={open}
      onClick={onCardClick}
      className={cx('group/card flex h-full w-full flex-col p-2', open && 'cursor-pointer')}
    >
      <div
        className={cx(
          'flex h-36 items-center justify-center rounded-md bg-paper-soft py-6 sm:h-44',
          'transition-opacity duration-200 ease-soft',
          !open && 'opacity-60',
        )}
      >
        {preview}
      </div>

      <GhostIconButton
        label={pinned ? copy.card.unpin(title) : copy.card.pin(title)}
        title={pinned ? copy.card.unpinShort : copy.card.pinShort}
        aria-pressed={pinned}
        onClick={onPin}
        className={cx(
          'absolute top-3.5 right-3.5 transition-opacity duration-200 ease-soft',
          pinned
            ? 'opacity-100'
            : 'opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100',
        )}
      >
        <PinIcon pinned={pinned} className={pinned ? 'text-accent' : undefined} />
      </GhostIconButton>

      <div className="flex flex-1 items-end justify-between gap-3 px-3 pt-4 pb-2">
        <div className="min-w-0">
          <h3 className="text-[15px] font-medium tracking-[-0.01em]">{title}</h3>
          {/* always two lines tall, so every title in a row sits at the same height */}
          <p className="meta mt-0.5 line-clamp-2 min-h-[3em]">{line}</p>
        </div>
        <GhostIconButton
          label={copy.card.open(title)}
          onClick={onOpen}
          disabled={!open}
          className="-mr-1 -mb-1"
        >
          <ArrowIcon />
        </GhostIconButton>
      </div>
    </Card>
  );
}

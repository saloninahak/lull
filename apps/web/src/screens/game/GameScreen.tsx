import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import type { GameId } from '@lull/game-logic';
import { reveal } from '../../lib/motion';
import { Controls } from '../../components/Controls';
import { Dock, DockButton } from '../../components/Dock';
import { GhostIconButton } from '../../components/GhostIconButton';
import { AgainIcon, BackIcon, HelpIcon, HomeIcon, UndoIcon } from '../../components/icons';
import { Lines, Sheet } from '../../components/Sheet';
import { copy } from '../../copy';
import type { Accent } from '../../lib/accent';
import { back, navigate } from '../../lib/router';

type GameScreenProps = {
  /** the screen's one accent. absent on neutral screens (start a room, join). */
  accent?: Accent;
  title: string;
  /** the small muted line under the title. defaults to "on this screen". */
  subtitle?: ReactNode;
  /** small option pills under the title (board size, players) */
  options?: ReactNode;
  /**
   * undo. on one device it steps back; in a room it asks to take a move
   * back (readme 5.3). leave both out to hide it. ctrl+z works too.
   */
  canUndo?: boolean;
  onUndo?: () => void;
  undoLabel?: string;
  /** the game whose rules the small ? opens */
  rules?: GameId;
  /** start again. leave out to hide it. */
  onAgain?: () => void;
  /** the stage: players, status, board */
  children: ReactNode;
};

/**
 * the in-game layout (readme 3.2): the board is centered and is the hero.
 * title and options sit small in the top-left, theme and sound top-right,
 * and a floating dock holds home, undo and start again.
 */
export function GameScreen({
  accent,
  title,
  subtitle = copy.play.sameScreen,
  options,
  canUndo,
  onUndo,
  undoLabel = copy.play.dock.undo,
  rules,
  onAgain,
  children,
}: GameScreenProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [showRules, setShowRules] = useState(false);

  // ctrl+z (or cmd+z) undoes, outside text fields
  const undoRef = useRef({ canUndo, onUndo });
  useEffect(() => {
    undoRef.current = { canUndo, onUndo };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== 'z') return;
      if ((e.target as HTMLElement | null)?.closest('input, textarea')) return;
      const { canUndo: can, onUndo: undo } = undoRef.current;
      if (!undo) return;
      e.preventDefault();
      if (can) undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.title = `${title} · ${copy.name}`;
    // land screen readers on the new screen
    heading.current?.focus({ preventScroll: true });
    return () => {
      document.title = copy.name;
    };
  }, [title]);

  return (
    // reduced motion turns movement off; opacity fades stay (readme 3.5)
    <MotionConfig reducedMotion="user">
      <div data-accent={accent} className="relative flex min-h-dvh flex-col">
        <div className="absolute top-3 right-3 z-10 flex items-center gap-0.5 sm:top-6 sm:right-6">
          {rules ? (
            <GhostIconButton label={copy.sheet.howToPlay} onClick={() => setShowRules(true)}>
              <HelpIcon />
            </GhostIconButton>
          ) : null}
          <Controls />
        </div>
        {rules ? (
          <Sheet open={showRules} onClose={() => setShowRules(false)} title={copy.sheet.howToPlay}>
            <Lines lines={copy.rules[rules] ?? []} />
          </Sheet>
        ) : null}

        {/* back sits top-left, level with theme and sound on the right */}
        <header className="flex items-start gap-2 px-3 pt-3 sm:gap-3 sm:px-6 sm:pt-6">
          <GhostIconButton label={copy.play.back} onClick={back}>
            <BackIcon />
          </GhostIconButton>
          <div className="min-w-0 pt-[11px] pr-48">
            <h1
              ref={heading}
              tabIndex={-1}
              className="flex items-center gap-2 text-[15px] font-medium tracking-[-0.01em] outline-none"
            >
              <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
              {title}
            </h1>
            <p className="meta mt-1 pl-3.5">{subtitle}</p>
          </div>
        </header>
        {options ? <div className="mt-4 flex flex-wrap gap-2 px-6 sm:px-10">{options}</div> : null}

        <main className="flex flex-1 flex-col items-center justify-center px-6 pt-4 pb-32 sm:pb-36">
          {children}
        </main>

        <Dock label={copy.play.dock.label}>
          <DockButton label={copy.play.dock.home} onClick={() => navigate('/')}>
            <HomeIcon />
          </DockButton>
          {onUndo ? (
            <DockButton label={undoLabel} disabled={!canUndo} onClick={onUndo}>
              <UndoIcon />
            </DockButton>
          ) : null}
          {onAgain ? (
            <DockButton label={copy.play.dock.again} onClick={onAgain}>
              <AgainIcon />
            </DockButton>
          ) : null}
        </Dock>
      </div>
    </MotionConfig>
  );
}

/**
 * the slot under the board: "again?" at the end, a draw offer in morris.
 * always the same height, and its contents fade in softly.
 */
export function BelowBoard({ show, children }: { show: string | null; children?: ReactNode }) {
  return (
    <div className="mt-6 flex min-h-11 items-center justify-center">
      <AnimatePresence mode="wait" initial={false}>
        {show ? (
          <motion.div
            key={show}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ ...reveal, delay: show === 'again' ? 0.55 : 0 }}
            className="flex flex-wrap items-center justify-center gap-2"
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

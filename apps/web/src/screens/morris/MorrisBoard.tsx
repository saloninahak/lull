import { useMemo, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import { MILLS, POINTS, type MorrisState, type PlayerColor } from '@lull/game-logic';
import { copy } from '../../copy';
import { drawIn, settle, stroke } from '../../lib/motion';
import { isKeyboardFocus, useRoving } from '../../lib/roving';

/** spacing of the 7x7 grid the 24 points sit on, in board units */
const G = 50;
const W = 6 * G + 60;
/** units per css pixel at a typical phone size, to keep strokes even */
const k = W / 340;

const at = (p: number) => {
  const [x, y] = POINTS[p]!;
  return [x * G, y * G] as const;
};

/** standard morris names: columns a to g, rows 1 to 7 from the bottom */
const spotName = (p: number) => {
  const [x, y] = POINTS[p]!;
  return `${'abcdefg'[x]}${7 - y}`;
};

const BOARD_PATH = [
  `M 0 0 H ${6 * G} V ${6 * G} H 0 Z`,
  `M ${G} ${G} H ${5 * G} V ${5 * G} H ${G} Z`,
  `M ${2 * G} ${2 * G} H ${4 * G} V ${4 * G} H ${2 * G} Z`,
  `M ${3 * G} 0 V ${2 * G} M ${3 * G} ${4 * G} V ${6 * G}`,
  `M 0 ${3 * G} H ${2 * G} M ${4 * G} ${3 * G} H ${6 * G}`,
];

type Seat = { name: string; color: PlayerColor };

type BoardProps = {
  state: MorrisState;
  seats: readonly [Seat, Seat];
  round: number;
  selected: number | null;
  targets: ReadonlySet<number>;
  removable: ReadonlySet<number>;
  inert: boolean;
  onPoint: (p: number, el: Element) => void;
  onCancel: () => void;
};

const roving = POINTS.map(([x, y]) => [x, y] as const);

/** how a piece leaves: instantly when it slid away, softly when removed */
const pieceVariants: Variants = {
  gone: (how: 'moved' | 'removed') =>
    how === 'moved'
      ? { opacity: 0, transition: { duration: 0 } }
      : { opacity: 0, scale: 0.4, transition: { duration: 0.26, ease: 'easeOut' } },
};

/**
 * three squares joined at the middles, thin lines and small points
 * (readme 7.4). pieces drop and settle, mills pulse once and a thin line
 * glows between them, removed pieces fade and shrink.
 */
export function MorrisBoard({
  state,
  seats,
  round,
  selected,
  targets,
  removable,
  inert,
  onPoint,
  onCancel,
}: BoardProps) {
  const reduce = useReducedMotion();
  const { onKeyDown, itemProps } = useRoving(roving);
  const [focused, setFocused] = useState<number | null>(null);

  const last = state.last;
  const newMillPoints = new Set(last && last.kind !== 'remove' ? last.mills.flat() : []);
  const newMillKeys = new Set(
    last && last.kind !== 'remove' ? last.mills.map((m) => `${m.join('-')}:${last.seat}`) : [],
  );

  // every mill standing right now gets a faint line; a new one draws in
  const standing = useMemo(
    () =>
      MILLS.flatMap((m) => {
        const owner = state.board[m[0]];
        if (owner === null || owner === undefined) return [];
        return m.every((p) => state.board[p] === owner)
          ? [{ key: `${m.join('-')}:${owner}`, mill: m, owner }]
          : [];
      }),
    [state.board],
  );

  const exitHow = last?.kind === 'move' ? 'moved' : 'removed';

  const onItemKey = (p: number) => (ev: KeyboardEvent) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      onPoint(p, ev.currentTarget);
    }
    if (ev.key === 'Escape') onCancel();
  };

  return (
    <svg
      viewBox={`-30 -30 ${W} ${W}`}
      className="aspect-square w-[min(calc(100vw_-_48px),calc(100dvh_-_440px),420px)] min-w-[264px] touch-manipulation overflow-visible select-none"
      role="group"
      aria-label={copy.play.board}
    >
      <g key={round} aria-hidden="true" fill="none" className="stroke-faint" strokeWidth={1.3 * k}>
        {BOARD_PATH.map((d, i) => (
          <motion.path
            key={d}
            d={d}
            strokeLinejoin="round"
            {...drawIn(reduce, stroke(0.45, i * 0.05))}
          />
        ))}
      </g>

      {/* standing mills */}
      <g aria-hidden="true" fill="none" strokeLinecap="round">
        {standing.map(({ key, mill, owner }) => {
          const [x1, y1] = at(mill[0]);
          const [x2, y2] = at(mill[2]);
          const fresh = newMillKeys.has(key);
          return (
            <motion.path
              key={`${round}-${key}`}
              d={`M ${x1} ${y1} L ${x2} ${y2}`}
              stroke={`var(--${seats[owner].color})`}
              strokeWidth={2.4 * k}
              initial={fresh ? (reduce ? { opacity: 0 } : { pathLength: 0, opacity: 0 }) : false}
              animate={{ pathLength: 1, opacity: fresh ? [0, 0.85, 0.4] : 0.4 }}
              transition={{
                pathLength: { duration: 0.32, delay: 0.18, ease: [0.33, 0, 0.2, 1] },
                opacity: { duration: 0.6, delay: 0.18, times: [0, 0.45, 1] },
              }}
            />
          );
        })}
      </g>

      {/* the points themselves */}
      <g aria-hidden="true" className="fill-muted">
        {POINTS.map((_, p) => {
          const [x, y] = at(p);
          return <circle key={p} cx={x} cy={y} r={3 * k} />;
        })}
      </g>

      {/* where the selected piece may go */}
      <g aria-hidden="true" className="pointer-events-none">
        <AnimatePresence>
          {[...targets].map((p) => {
            const [x, y] = at(p);
            return (
              <motion.circle
                key={p}
                cx={x}
                cy={y}
                r={7 * k}
                fill="var(--accent)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            );
          })}
        </AnimatePresence>
      </g>

      {/* pieces */}
      <g aria-hidden="true" className="pointer-events-none">
        <AnimatePresence custom={exitHow}>
          {state.board.map((owner, p) => {
            if (owner === null) return null;
            const [x, y] = at(p);
            const placed = last?.kind === 'place' && last.to === p;
            const moved = last?.kind === 'move' && last.to === p;
            const from = moved ? at(last.from) : null;
            const pulse = newMillPoints.has(p);
            return (
              <g key={`${round}-${p}`} transform={`translate(${x} ${y})`}>
                <motion.g
                  custom={exitHow}
                  variants={pieceVariants}
                  exit="gone"
                  initial={
                    placed
                      ? { scale: 1.3, opacity: 0, y: -6 * k }
                      : from
                        ? { x: from[0] - x, y: from[1] - y }
                        : false
                  }
                  animate={{ opacity: 1, x: 0, y: 0, scale: pulse ? [null, 1.16, 1] : 1 }}
                  transition={{
                    ...settle,
                    opacity: { duration: 0.16 },
                    scale: pulse
                      ? { duration: 0.46, delay: 0.16, times: [0, 0.4, 1], ease: 'easeInOut' }
                      : settle,
                  }}
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                >
                  <Piece color={seats[owner].color} hollow={owner === 1} />
                </motion.g>
              </g>
            );
          })}
        </AnimatePresence>
      </g>

      {/* rings: selected, removable, keyboard focus */}
      <g aria-hidden="true" fill="none" className="pointer-events-none">
        {selected !== null ? (
          <Ring p={selected} r={21 * k} className="stroke-ink" opacity={0.45} width={1.5 * k} />
        ) : null}
        {[...removable].map((p) => (
          <Ring key={p} p={p} r={21 * k} stroke="var(--accent)" opacity={0.7} width={1.5 * k} />
        ))}
        {focused !== null ? (
          <Ring p={focused} r={25 * k} stroke="var(--accent)" opacity={1} width={2 * k} />
        ) : null}
      </g>

      {/* tap areas, about 45px wide on a phone */}
      <g onKeyDown={onKeyDown}>
        {POINTS.map((_, p) => {
          const [x, y] = at(p);
          const owner = state.board[p];
          const item = itemProps(p);
          const hint =
            selected === p
              ? copy.morris.hints.selected
              : targets.has(p)
                ? copy.morris.hints.target
                : removable.has(p)
                  ? copy.morris.hints.removable
                  : null;
          return (
            <circle
              key={p}
              cx={x}
              cy={y}
              r={24}
              role="button"
              aria-label={copy.morris.point(
                spotName(p),
                owner === null || owner === undefined ? null : seats[owner].name,
                hint,
              )}
              aria-disabled={inert}
              tabIndex={item.tabIndex}
              ref={item.ref}
              fill="transparent"
              className={inert ? 'outline-none' : 'cursor-pointer outline-none'}
              onClick={(ev) => onPoint(p, ev.currentTarget)}
              onKeyDown={onItemKey(p)}
              onFocus={(ev) => {
                item.onFocus();
                if (isKeyboardFocus(ev.currentTarget)) setFocused(p);
              }}
              onBlur={() => setFocused((f) => (f === p ? null : f))}
            />
          );
        })}
      </g>
    </svg>
  );
}

/** a piece. the second player's has a small hollow center, so color is not the only signal. */
function Piece({ color, hollow }: { color: PlayerColor; hollow: boolean }) {
  return (
    <>
      <circle r={15 * k} fill={`var(--${color})`} />
      {hollow ? <circle r={5 * k} fill="var(--bg)" /> : null}
    </>
  );
}

function Ring({
  p,
  r,
  width,
  opacity,
  stroke: color,
  className,
}: {
  p: number;
  r: number;
  width: number;
  opacity: number;
  stroke?: string;
  className?: string;
}) {
  const [x, y] = at(p);
  return (
    <circle
      cx={x}
      cy={y}
      r={r}
      stroke={color}
      strokeWidth={width}
      opacity={opacity}
      className={className}
    />
  );
}

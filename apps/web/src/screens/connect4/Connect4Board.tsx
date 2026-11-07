import { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  C4_COLS,
  C4_ROWS,
  landingRow,
  type Connect4State,
  type PlayerColor,
} from '@lull/game-logic';
import { copy } from '../../copy';
import { cx } from '../../lib/cx';
import { drawIn, settle, stroke } from '../../lib/motion';
import { useRoving } from '../../lib/roving';

/** the frame is drawn in fixed units: 100 per cell */
const CELL = 100;
const W = C4_COLS * CELL;
const H = C4_ROWS * CELL;
const R = 38;

const COLUMNS = Array.from({ length: C4_COLS }, (_, c) => [c, 0] as const);

type BoardProps = {
  state: Connect4State;
  /** the two players' colors, in seat order */
  colors: readonly [PlayerColor, PlayerColor];
  /** your seat, when it's your turn, so a hover shows where your disc would land */
  ghost: 0 | 1 | null;
  onColumn: (col: number, el: HTMLElement) => void;
};

const center = (cell: number) =>
  [(cell % C4_COLS) * CELL + CELL / 2, Math.floor(cell / C4_COLS) * CELL + CELL / 2] as const;

/**
 * a quiet frame of hairline holes. a disc drops from above its column and
 * settles; four in a row get a thin line through them and the rest step back.
 */
export function Connect4Board({ state, colors, ghost, onColumn }: BoardProps) {
  const reduce = useReducedMotion();
  const { onKeyDown, itemProps } = useRoving(COLUMNS);
  const over = state.winner !== null || state.draw;
  const inLine = useMemo(() => new Set(state.winLine ?? []), [state.winLine]);

  const winPath = useMemo(() => {
    const line = state.winLine;
    if (!line || line.length < 2) return null;
    const [x1, y1] = center(line[0]!);
    const [x2, y2] = center(line[line.length - 1]!);
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ext = (CELL * 0.32) / len;
    return `M ${x1 - (x2 - x1) * ext} ${y1 - (y2 - y1) * ext} L ${x2 + (x2 - x1) * ext} ${y2 + (y2 - y1) * ext}`;
  }, [state.winLine]);

  return (
    <div
      className="relative w-[min(calc(100vw_-_48px),calc((100dvh_-_400px)*7/6),480px)] min-w-[280px]"
      style={{ aspectRatio: `${C4_COLS} / ${C4_ROWS}` }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="pointer-events-none absolute inset-0 size-full overflow-visible"
        aria-hidden="true"
        focusable="false"
      >
        {/* the holes */}
        <g className="fill-none stroke-faint" strokeWidth={2}>
          {state.board.map((_, i) => {
            const [x, y] = center(i);
            return <circle key={i} cx={x} cy={y} r={R} />;
          })}
        </g>

        {/* discs */}
        {state.board.map((seat, i) => {
          if (seat === null) return null;
          const [x, y] = center(i);
          const row = Math.floor(i / C4_COLS);
          const fresh = i === state.last;
          const dim = state.winner !== null && !inLine.has(i);
          return (
            <motion.g
              key={i}
              initial={fresh ? { y: -(row + 1) * CELL - CELL / 2, opacity: 0 } : false}
              animate={{ y: 0, opacity: dim ? 0.3 : 1 }}
              transition={{
                y: settle,
                opacity: { duration: dim ? 0.3 : 0.08, delay: dim ? 0.3 : 0 },
              }}
            >
              <circle cx={x} cy={y} r={R - 2} fill={`var(--${colors[seat]})`} />
              {/* the second player's discs have a hollow center, so color isn't the only signal */}
              {seat === 1 ? <circle cx={x} cy={y} r={R * 0.36} fill="var(--bg)" /> : null}
            </motion.g>
          );
        })}

        {winPath ? (
          <motion.path
            d={winPath}
            fill="none"
            stroke="var(--text)"
            strokeOpacity={0.7}
            strokeWidth={5}
            strokeLinecap="round"
            {...drawIn(reduce, stroke(0.45, 0.35))}
          />
        ) : null}
      </svg>

      <div
        role="group"
        aria-label={copy.play.board}
        onKeyDown={onKeyDown}
        className="absolute inset-0 grid"
        style={{ gridTemplateColumns: `repeat(${C4_COLS}, 1fr)` }}
      >
        {COLUMNS.map(([col]) => {
          const row = landingRow(state.board, col);
          const full = row < 0;
          const playable = !over && !full && ghost !== null;
          return (
            <button
              key={col}
              type="button"
              {...itemProps(col)}
              aria-label={copy.connect4.column(col, full)}
              aria-disabled={!playable}
              onClick={(e) => onColumn(col, e.currentTarget)}
              className={cx(
                'group relative rounded-md outline-offset-[-4px] select-none',
                playable ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              {playable ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 flex items-center justify-center opacity-0 transition-opacity duration-200 ease-soft group-hover:opacity-25 group-focus-visible:opacity-30"
                  style={{ top: `${(row / C4_ROWS) * 100}%`, height: `${100 / C4_ROWS}%` }}
                >
                  <span
                    className="block aspect-square w-[72%] rounded-full"
                    style={{ backgroundColor: `var(--${colors[ghost]})` }}
                  />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

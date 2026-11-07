import { useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Mark, TicTacToeState } from '@lull/game-logic';
import { copy } from '../../copy';
import { cx } from '../../lib/cx';
import { drawIn, stroke } from '../../lib/motion';
import { useRoving } from '../../lib/roving';

/** the board is drawn in a fixed 300-unit space, whatever its size on screen */
const UNITS = 300;
/** stroke widths in board units, about 1.4px and 3.4px on a phone */
const GRID_W = 1;
const WIN_W = 3;

const MARK_COLOR: Record<Mark, string> = { x: 'var(--blue)', o: 'var(--graphite)' };

type BoardProps = {
  state: TicTacToeState;
  /** changes on every fresh game, so the grid draws itself again */
  round: number;
  /** in a room, only on your own turn. the hover preview follows it. */
  interactive?: boolean;
  onCell: (cell: number, el: HTMLElement) => void;
};

/** a hairline grid of thin lines (not boxes), generous cells (readme 7.1) */
export function TicTacToeBoard({ state, round, interactive = true, onCell }: BoardProps) {
  const n = state.size;
  const cell = UNITS / n;
  const over = state.winner !== null || state.draw || !interactive;
  const reduce = useReducedMotion();

  const points = useMemo(
    () => Array.from({ length: n * n }, (_, i) => [i % n, Math.floor(i / n)] as const),
    [n],
  );
  const { onKeyDown, itemProps } = useRoving(points);

  const gridLines = useMemo(() => {
    const inset = cell * 0.08;
    const lines: string[] = [];
    for (let k = 1; k < n; k++) {
      lines.push(`M ${k * cell} ${inset} V ${UNITS - inset}`);
      lines.push(`M ${inset} ${k * cell} H ${UNITS - inset}`);
    }
    return lines;
  }, [n, cell]);

  const winPath = useMemo(() => {
    const line = state.winLine;
    if (!line || line.length < 2) return null;
    const center = (i: number) => [((i % n) + 0.5) * cell, (Math.floor(i / n) + 0.5) * cell];
    const [x1, y1] = center(line[0]!) as [number, number];
    const [x2, y2] = center(line[line.length - 1]!) as [number, number];
    // reach a little past the outer marks
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ext = (cell * 0.3) / len;
    const sx = x1 - (x2 - x1) * ext;
    const sy = y1 - (y2 - y1) * ext;
    const ex = x2 + (x2 - x1) * ext;
    const ey = y2 + (y2 - y1) * ext;
    return `M ${sx} ${sy} L ${ex} ${ey}`;
  }, [state.winLine, n, cell]);

  return (
    <div className="relative aspect-square w-[min(calc(100vw_-_48px),calc(100dvh_-_440px),420px)] min-w-[264px]">
      <svg
        viewBox={`0 0 ${UNITS} ${UNITS}`}
        className="pointer-events-none absolute inset-0 size-full overflow-visible"
        aria-hidden="true"
        focusable="false"
      >
        <g key={round} fill="none" strokeLinecap="round" className="stroke-faint">
          {gridLines.map((d, i) => (
            <motion.path
              key={d}
              d={d}
              strokeWidth={GRID_W}
              {...drawIn(reduce, stroke(0.34, i * 0.04))}
            />
          ))}
        </g>
        {winPath && state.winner ? (
          <motion.path
            d={winPath}
            fill="none"
            stroke={MARK_COLOR[state.winner]}
            strokeWidth={WIN_W}
            strokeLinecap="round"
            {...drawIn(reduce, stroke(0.5, 0.34))}
          />
        ) : null}
      </svg>

      <div
        role="group"
        aria-label={copy.play.board}
        onKeyDown={onKeyDown}
        className="absolute inset-0 grid"
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
      >
        {state.board.map((mark, i) => {
          const playable = !over && mark === null;
          const inWin = state.winLine?.includes(i) ?? false;
          return (
            <button
              key={i}
              type="button"
              {...itemProps(i)}
              aria-label={copy.tictactoe.cell(Math.floor(i / n), i % n, mark)}
              aria-disabled={!playable}
              onClick={(e) => onCell(i, e.currentTarget)}
              className={cx(
                'group relative rounded-md outline-offset-[-10px] select-none',
                playable ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              <AnimatePresence>
                {mark ? (
                  <MarkGlyph
                    key={mark}
                    mark={mark}
                    size={n}
                    dim={state.winner !== null && !inWin}
                    reduce={reduce}
                  />
                ) : null}
              </AnimatePresence>
              {playable ? <GhostGlyph mark={state.turn} size={n} /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* marks ----------------------------------------------------------------------- */

const glyphClass = 'pointer-events-none absolute inset-0 size-full';
const markWidth = (size: number) => (size === 3 ? 3.4 : 4.6);

function MarkGlyph({
  mark,
  size,
  dim,
  reduce,
}: {
  mark: Mark;
  size: number;
  dim: boolean;
  reduce: boolean | null;
}) {
  const common = {
    fill: 'none',
    stroke: MARK_COLOR[mark],
    strokeWidth: markWidth(size),
    strokeLinecap: 'round' as const,
  };
  return (
    <motion.svg
      viewBox="0 0 100 100"
      className={glyphClass}
      aria-hidden="true"
      focusable="false"
      initial={{ opacity: 1 }}
      // after a win the marks outside the line step back
      animate={{ opacity: dim ? 0.28 : 1 }}
      exit={{ opacity: 0, transition: { duration: 0.16 } }}
      transition={{ duration: 0.3, delay: dim ? 0.3 : 0 }}
    >
      {mark === 'x' ? (
        <>
          {/* two quick strokes */}
          <motion.path d="M 30 30 L 70 70" {...common} {...drawIn(reduce, stroke(0.15))} />
          <motion.path d="M 70 30 L 30 70" {...common} {...drawIn(reduce, stroke(0.15, 0.12))} />
        </>
      ) : (
        // one circle sweep, starting at the top
        <motion.circle
          cx="50"
          cy="50"
          r="21"
          transform="rotate(-90 50 50)"
          {...common}
          {...drawIn(reduce, stroke(0.3))}
        />
      )}
    </motion.svg>
  );
}

/** a faint preview of the next mark, on hover or keyboard focus */
function GhostGlyph({ mark, size }: { mark: Mark; size: number }) {
  const common = {
    fill: 'none',
    stroke: MARK_COLOR[mark],
    strokeWidth: markWidth(size),
    strokeLinecap: 'round' as const,
  };
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      className={cx(
        glyphClass,
        'opacity-0 transition-opacity duration-200 ease-soft',
        'group-hover:opacity-20 group-focus-visible:opacity-25',
      )}
    >
      {mark === 'x' ? (
        <path d="M 30 30 L 70 70 M 70 30 L 30 70" {...common} />
      ) : (
        <circle cx="50" cy="50" r="21" {...common} />
      )}
    </svg>
  );
}

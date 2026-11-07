import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { lineBetween, type Placement } from '@lull/game-logic';
import { copy } from '../../copy';
import { cx } from '../../lib/cx';
import { nudge } from '../../lib/nudge';
import { nearestInDirection } from '../../lib/roving';

/** 100 units per cell in the overlay */
const CELL = 100;

type BoardProps = {
  size: number;
  grid: readonly string[];
  words: readonly string[];
  /** your finds */
  found: readonly Placement[];
  editable: boolean;
  /** a cell to point at, from a hint */
  hintCell?: number | null;
  onFind: (from: number, to: number, el: Element | null) => void;
};

/** where a drag from `start` toward `over` lands, snapped to the nearest of the eight ways */
function snap(size: number, start: number, over: number): number {
  const r = Math.floor(start / size);
  const c = start % size;
  const dr = Math.floor(over / size) - r;
  const dc = (over % size) - c;
  if (dr === 0 && dc === 0) return start;
  const angle = Math.round(Math.atan2(dr, dc) / (Math.PI / 4)) * (Math.PI / 4);
  const sr = Math.round(Math.sin(angle));
  const sc = Math.round(Math.cos(angle));
  let len = Math.max(Math.abs(dr), Math.abs(dc));
  while (len > 0) {
    const er = r + sr * len;
    const ec = c + sc * len;
    if (er >= 0 && er < size && ec >= 0 && ec < size) return er * size + ec;
    len--;
  }
  return start;
}

/**
 * a square of letters in mono. drag from a word's first letter to its last
 * (or click one, then the other). each find gets a soft capsule in the
 * accent, and the word is crossed off the list.
 */
export function WordSearchBoard({
  size,
  grid,
  words,
  found,
  editable,
  hintCell = null,
  onFind,
}: BoardProps) {
  const reduce = useReducedMotion();
  const units = size * CELL;
  const points = useMemo(
    () => Array.from({ length: size * size }, (_, i) => [i % size, Math.floor(i / size)] as const),
    [size],
  );
  const [focus, setFocus] = useState(0);
  /** the first letter picked by a click or the keyboard */
  const [anchor, setAnchor] = useState<number | null>(null);
  /** a drag in progress: where it began and where it reaches */
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const dragging = useRef(false);
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const center = (c: number) =>
    [(c % size) * CELL + CELL / 2, Math.floor(c / size) * CELL + CELL / 2] as const;
  const capsule = (from: number, to: number) => {
    const [x1, y1] = center(from);
    const [x2, y2] = center(to);
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  };
  const inFound = useMemo(() => new Set(found.flatMap((f) => f.cells)), [found]);
  const doneWords = new Set(found.map((f) => f.word));

  const submit = (from: number, to: number, el: Element | null) => {
    if (!lineBetween(size, from, to)) return nudge(el);
    onFind(from, to, el);
  };

  const pick = (cell: number, el: Element | null) => {
    if (!editable) return nudge(el);
    if (anchor === null) return setAnchor(cell);
    if (anchor === cell) return setAnchor(null);
    const from = anchor;
    setAnchor(null);
    submit(from, cell, el);
  };

  const cellAt = (e: PointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const v = el?.closest<HTMLElement>('[data-cell]')?.dataset.cell;
    return v === undefined ? null : Number(v);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!editable || e.button !== 0) return;
    const cell = cellAt(e);
    if (cell === null) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    setDrag({ from: cell, to: cell });
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !drag) return;
    const cell = cellAt(e);
    if (cell === null) return;
    const to = snap(size, drag.from, cell);
    if (to !== drag.to) setDrag({ ...drag, to });
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !drag) return;
    dragging.current = false;
    const { from, to } = drag;
    setDrag(null);
    const el = cellRefs.current[to] ?? null;
    // no movement is a click: it picks a first letter, or finishes one
    if (from === to) return pick(from, el);
    setAnchor(null);
    submit(from, to, el ?? e.currentTarget);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const cell = Number((e.target as HTMLElement).dataset.cell);
    if (!Number.isInteger(cell)) return;
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const next = nearestInDirection(points, cell, e.key);
      setFocus(next);
      cellRefs.current[next]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(cell, e.target as Element);
    } else if (e.key === 'Escape') {
      setAnchor(null);
    }
  };

  // what's being marked right now: a drag, or from the picked letter to the focused one
  const live = drag
    ? drag
    : anchor !== null && focus !== anchor && lineBetween(size, anchor, focus)
      ? { from: anchor, to: focus }
      : null;

  return (
    <div className="flex w-full flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center lg:gap-12">
      <div className="relative aspect-square w-[min(calc(100vw_-_48px),calc(100dvh_-_420px),480px)] min-w-[288px] shrink-0">
        <svg
          viewBox={`0 0 ${units} ${units}`}
          className="pointer-events-none absolute inset-0 size-full"
          aria-hidden="true"
          focusable="false"
        >
          <rect
            x={2}
            y={2}
            width={units - 4}
            height={units - 4}
            rx={24}
            fill="none"
            className="stroke-faint"
            strokeWidth={3}
          />
          <g fill="none" strokeLinecap="round">
            {found.map((f) => (
              <motion.path
                key={f.word}
                d={capsule(f.cells[0]!, f.cells[f.cells.length - 1]!)}
                stroke="var(--accent)"
                strokeOpacity={0.28}
                strokeWidth={CELL * 0.72}
                initial={reduce ? { opacity: 0 } : { pathLength: 0 }}
                animate={reduce ? { opacity: 1 } : { pathLength: 1 }}
                transition={{ duration: 0.24, ease: [0.33, 0, 0.2, 1] }}
              />
            ))}
            {live && live.from !== live.to ? (
              <path
                d={capsule(live.from, live.to)}
                className="stroke-ink"
                strokeOpacity={0.1}
                strokeWidth={CELL * 0.72}
              />
            ) : null}
          </g>
          {anchor !== null ? (
            <circle
              cx={center(anchor)[0]}
              cy={center(anchor)[1]}
              r={CELL * 0.38}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={5}
            />
          ) : null}
          {hintCell !== null && !inFound.has(hintCell) ? (
            <motion.circle
              cx={center(hintCell)[0]}
              cy={center(hintCell)[1]}
              r={CELL * 0.4}
              fill="none"
              className="stroke-ink"
              strokeWidth={4}
              strokeDasharray="10 8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ duration: 0.24 }}
            />
          ) : null}
        </svg>

        <div
          role="grid"
          aria-label={copy.play.board}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            dragging.current = false;
            setDrag(null);
          }}
          className="absolute inset-0 grid touch-none select-none"
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        >
          {grid.map((letter, i) => (
            <button
              key={i}
              ref={(el) => {
                cellRefs.current[i] = el;
              }}
              type="button"
              role="gridcell"
              data-cell={i}
              tabIndex={i === focus ? 0 : -1}
              aria-label={copy.wordsearch.cell(
                Math.floor(i / size),
                i % size,
                letter,
                anchor === i,
                hintCell === i,
              )}
              aria-pressed={anchor === i}
              aria-disabled={!editable}
              onFocus={() => setFocus(i)}
              onClick={(e) => {
                // keyboard and screen readers; a mouse is handled on pointer up
                if (e.detail === 0) pick(i, e.currentTarget);
              }}
              className={cx(
                'grid place-items-center rounded-md font-mono uppercase outline-offset-[-3px]',
                size >= 12 ? 'text-[14px] sm:text-[16px]' : 'text-[16px] sm:text-[19px]',
                inFound.has(i) ? 'text-ink' : 'text-ink/80',
                editable ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      <ul
        aria-label={copy.wordsearch.list}
        className="grid grid-cols-2 gap-x-8 gap-y-2 font-mono text-[14px] sm:grid-cols-3 lg:w-[220px] lg:grid-cols-1 lg:pt-2"
      >
        {words.map((w) => {
          const done = doneWords.has(w);
          return (
            <li
              key={w}
              aria-label={copy.wordsearch.word(w, done)}
              className={cx(
                'transition-colors duration-300',
                done ? 'text-muted line-through decoration-accent decoration-2' : 'text-ink',
              )}
            >
              {w}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { useEffect, useMemo, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { validPath } from '@lull/game-logic';
import { copy } from '../../copy';
import { cx } from '../../lib/cx';
import { useRoving } from '../../lib/roving';

/** 100 units per cell */
const CELL = 100;

type BoardProps = {
  size: number;
  numbers: readonly number[];
  /** your line so far */
  path: readonly number[];
  editable: boolean;
  /** the line changed while dragging */
  onDraft: (cells: number[]) => void;
  /** the finger lifted, or a key was pressed: time to tell the server */
  onCommit: (cells: number[]) => void;
};

/** where a tap on `cell` takes the line: start it, grow it, or pull it back */
export function stepTo(
  puzzle: { size: number; numbers: readonly number[] },
  path: readonly number[],
  cell: number,
): number[] | null {
  const at = path.indexOf(cell);
  if (at >= 0) return path.slice(0, at + 1);
  const next = [...path, cell];
  return validPath({ size: puzzle.size as 6 | 7, numbers: [...puzzle.numbers] }, next)
    ? next
    : null;
}

/**
 * the zip grid. a soft line runs through the cell centers in the accent.
 * numbered cells are small ink discs. dragging back over your own line
 * pulls it back to that cell.
 */
export function ZipBoard({ size, numbers, path, editable, onDraft, onCommit }: BoardProps) {
  const units = size * CELL;
  const dragging = useRef(false);
  const latest = useRef<number[]>([...path]);
  useEffect(() => {
    if (!dragging.current) latest.current = [...path];
  }, [path]);

  const points = useMemo(
    () => Array.from({ length: size * size }, (_, i) => [i % size, Math.floor(i / size)] as const),
    [size],
  );
  const { onKeyDown: rove, itemProps } = useRoving(points);
  // backspace takes the line back one cell
  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.key === 'Backspace' || e.key === 'Delete') && editable) {
      e.preventDefault();
      if (latest.current.length > 0) {
        latest.current = latest.current.slice(0, -1);
        onCommit(latest.current);
      }
      return;
    }
    rove(e);
  };
  const onLine = useMemo(() => new Set(path), [path]);

  const center = (c: number) =>
    [(c % size) * CELL + CELL / 2, Math.floor(c / size) * CELL + CELL / 2] as const;
  const d = path.map((c, i) => `${i ? 'L' : 'M'} ${center(c)[0]} ${center(c)[1]}`).join(' ');

  const step = (cell: number) => {
    const next = stepTo({ size, numbers }, latest.current, cell);
    if (!next) return false;
    latest.current = next;
    onDraft(next);
    return true;
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
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    step(cell);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const cell = cellAt(e);
    if (cell === null || cell === latest.current[latest.current.length - 1]) return;
    step(cell);
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    onCommit(latest.current);
  };

  return (
    <div className="relative aspect-square w-[min(calc(100vw_-_48px),calc(100dvh_-_420px),440px)] min-w-[280px]">
      <svg
        viewBox={`0 0 ${units} ${units}`}
        className="pointer-events-none absolute inset-0 size-full overflow-visible"
        aria-hidden="true"
        focusable="false"
      >
        <rect
          x={1}
          y={1}
          width={units - 2}
          height={units - 2}
          rx={18}
          fill="none"
          className="stroke-faint"
          strokeWidth={2}
        />
        <g className="stroke-hairline" strokeWidth={2}>
          {Array.from({ length: size - 1 }, (_, k) => (
            <path key={k} d={`M ${(k + 1) * CELL} 0 V ${units} M 0 ${(k + 1) * CELL} H ${units}`} />
          ))}
        </g>
        {path.length > 0 ? (
          <path
            d={path.length === 1 ? `${d} L ${center(path[0]!)[0]} ${center(path[0]!)[1]}` : d}
            fill="none"
            stroke="var(--accent)"
            strokeOpacity={0.4}
            strokeWidth={CELL * 0.42}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {numbers.map((n, i) => {
          if (!n) return null;
          const [x, y] = center(i);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={CELL * 0.27} fill="var(--text)" />
              <text
                x={x}
                y={y}
                dy="0.35em"
                textAnchor="middle"
                fill="var(--bg)"
                fontSize={CELL * 0.26}
                className="font-mono"
              >
                {n}
              </text>
            </g>
          );
        })}
      </svg>

      <div
        role="grid"
        aria-label={copy.play.board}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="absolute inset-0 grid touch-none select-none"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        {numbers.map((n, i) => (
          <button
            key={i}
            type="button"
            role="gridcell"
            data-cell={i}
            {...itemProps(i)}
            aria-label={copy.zip.cell(Math.floor(i / size), i % size, n, onLine.has(i))}
            aria-disabled={!editable}
            onClick={(e) => {
              // keyboard and screen readers. a mouse tap is handled on pointer down.
              if (e.detail !== 0 || !editable) return;
              if (step(i)) onCommit(latest.current);
            }}
            className={cx(
              'rounded-md outline-offset-[-6px]',
              editable ? 'cursor-pointer' : 'cursor-default',
            )}
          />
        ))}
      </div>
    </div>
  );
}

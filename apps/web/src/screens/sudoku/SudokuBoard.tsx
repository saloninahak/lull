import { useMemo, useState, type KeyboardEvent } from 'react';
import { conflicts, PEERS } from '@lull/game-logic';
import { copy } from '../../copy';
import { cx } from '../../lib/cx';
import { nudge } from '../../lib/nudge';
import { nearestInDirection } from '../../lib/roving';

/** 50 units per cell */
const CELL = 50;
const UNITS = CELL * 9;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const POINTS = Array.from({ length: 81 }, (_, i) => [i % 9, Math.floor(i / 9)] as const);

const LINES = (() => {
  const thin: string[] = [];
  const thick: string[] = [];
  for (let k = 1; k < 9; k++) {
    const to = k % 3 === 0 ? thick : thin;
    to.push(`M ${k * CELL} 0 V ${UNITS}`, `M 0 ${k * CELL} H ${UNITS}`);
  }
  return { thin, thick };
})();

const emptyNotes = () => Array.from({ length: 81 }, () => [] as number[]);

type BoardProps = {
  puzzle: readonly number[];
  /** your grid, or null when watching */
  grid: readonly number[] | null;
  /** once someone has finished, the answer fills what you left */
  solution: readonly number[] | null;
  onSet: (cell: number, digit: number) => void;
  /**
   * on your own: fill one cell. it gets the chosen cell, and returns the
   * cell it filled so the board can point at it. absent in a race.
   */
  onHint?: (chosen: number | null) => number | null;
};

/**
 * a sudoku in hairlines, box lines a touch stronger. pick a cell, then a
 * digit. the cells that share a row, column or box get a barely-there
 * tint, the same digit elsewhere a soft one, and a repeat is marked on
 * both cells. notes are this pc's scribbles: they never leave it.
 */
export function SudokuBoard({ puzzle, grid, solution, onSet, onHint }: BoardProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const [focus, setFocus] = useState(0);
  const [notesOn, setNotesOn] = useState(false);
  const [notes, setNotes] = useState<number[][]>(emptyNotes);

  const shown = grid ?? puzzle;
  const editable = grid !== null && solution === null;
  const clash = useMemo(() => new Set(conflicts(shown)), [shown]);
  const peers = useMemo(() => new Set(picked !== null ? PEERS[picked] : []), [picked]);
  const pickedDigit = picked !== null ? shown[picked]! : 0;

  // how many of each digit are on the board, and which are finished
  const placed = useMemo(() => {
    const n = Array<number>(10).fill(0);
    for (const d of shown) n[d]!++;
    return n;
  }, [shown]);
  const clashDigits = useMemo(() => new Set([...clash].map((c) => shown[c])), [clash, shown]);
  const finished = (d: number) => placed[d]! >= 9 && !clashDigits.has(d);

  /** notes still worth showing: none in a filled cell, none a neighbour already holds */
  const notesFor = (cell: number) =>
    shown[cell] !== 0 ? [] : notes[cell]!.filter((d) => !PEERS[cell]!.some((o) => shown[o] === d));

  const toggleNote = (cell: number, d: number) =>
    setNotes((all) => {
      const next = all.slice();
      const here = next[cell]!;
      next[cell] = here.includes(d) ? here.filter((x) => x !== d) : [...here, d].sort();
      return next;
    });

  const enter = (cell: number | null, d: number, el: Element | null, asNote = notesOn) => {
    if (cell === null || !editable || puzzle[cell] !== 0) return nudge(el);
    if (asNote) {
      if (shown[cell] !== 0) return nudge(el);
      return toggleNote(cell, d);
    }
    if (shown[cell] !== d) onSet(cell, d);
  };

  const erase = (cell: number | null, el: Element | null) => {
    if (cell === null || !editable || puzzle[cell] !== 0) return nudge(el);
    if (shown[cell] !== 0) return onSet(cell, 0);
    if (notes[cell]!.length) {
      setNotes((all) => all.map((n, i) => (i === cell ? [] : n)));
      return;
    }
    nudge(el);
  };

  const hint = (el: Element | null) => {
    const cell = onHint?.(picked) ?? null;
    if (cell === null) return nudge(el);
    setPicked(cell);
    setFocus(cell);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const cell = Number(target.dataset.cell);
    if (!Number.isInteger(cell)) return;
    const digit = /^(?:Digit|Numpad)([1-9])$/.exec(e.code)?.[1];
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const next = nearestInDirection(POINTS, cell, e.key);
      setFocus(next);
      setPicked(next);
      (target.parentElement?.querySelector(`[data-cell="${next}"]`) as HTMLElement | null)?.focus();
    } else if (digit) {
      e.preventDefault();
      // shift and a digit jots a note, whatever mode you're in
      enter(cell, Number(digit), target, notesOn || e.shiftKey);
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      e.preventDefault();
      erase(cell, target);
    } else if (e.key.toLowerCase() === 'n' && editable) {
      e.preventDefault();
      setNotesOn((on) => !on);
    }
  };

  const size = 'w-[min(calc(100vw_-_48px),calc(100dvh_-_500px),432px)] min-w-[288px]';

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={cx('relative aspect-square', size)}>
        <svg
          viewBox={`0 0 ${UNITS} ${UNITS}`}
          className="pointer-events-none absolute inset-0 size-full overflow-visible"
          aria-hidden="true"
          focusable="false"
        >
          <rect
            x={0.5}
            y={0.5}
            width={UNITS - 1}
            height={UNITS - 1}
            rx={10}
            fill="none"
            className="stroke-faint"
            strokeWidth={1.5}
          />
          <g fill="none" strokeLinecap="round">
            <g className="stroke-hairline" strokeWidth={1}>
              {LINES.thin.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
            <g className="stroke-faint" strokeWidth={1.5}>
              {LINES.thick.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
          </g>
        </svg>

        <div
          role="grid"
          aria-label={copy.play.board}
          onKeyDown={onKeyDown}
          className="absolute inset-0 grid grid-cols-9"
        >
          {shown.map((d, i) => {
            const given = puzzle[i] !== 0;
            const missing = solution !== null && d !== solution[i];
            const digit = missing ? solution[i]! : d;
            const cellNotes = notesFor(i);
            const repeated = clash.has(i);
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                data-cell={i}
                tabIndex={i === focus ? 0 : -1}
                aria-label={
                  digit
                    ? copy.sudoku.cell(Math.floor(i / 9), i % 9, digit, given)
                    : copy.sudoku.noteCell(Math.floor(i / 9), i % 9, cellNotes)
                }
                aria-selected={picked === i}
                onFocus={() => setFocus(i)}
                onClick={() => setPicked(i)}
                className={cx(
                  'relative grid place-items-center outline-offset-[-3px] select-none',
                  'transition-colors duration-150 ease-soft',
                  picked === i
                    ? 'bg-accent/20'
                    : repeated
                      ? 'bg-ink/[0.08]'
                      : pickedDigit !== 0 && d === pickedDigit
                        ? 'bg-accent/10'
                        : peers.has(i)
                          ? 'bg-ink/[0.03]'
                          : 'hover:bg-ink/[0.03]',
                  editable && !given ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                {digit ? (
                  <span
                    className={cx(
                      'font-mono text-[17px] tabular-nums',
                      given ? 'font-semibold text-ink' : missing ? 'text-muted' : 'text-ink/75',
                      repeated &&
                        !given &&
                        'underline decoration-ink/50 decoration-wavy decoration-1 underline-offset-[5px]',
                    )}
                  >
                    {digit}
                  </span>
                ) : cellNotes.length ? (
                  <span
                    aria-hidden="true"
                    className="grid size-full grid-cols-3 grid-rows-3 p-[3px] font-mono text-[9px] leading-none text-muted sm:text-[10px]"
                  >
                    {DIGITS.map((n) => (
                      <span
                        key={n}
                        className={cx(
                          'grid place-items-center',
                          pickedDigit === n && 'font-semibold text-ink',
                        )}
                      >
                        {cellNotes.includes(n) ? n : ''}
                      </span>
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {editable ? (
        <>
          <div
            role="group"
            aria-label={copy.sudoku.digits}
            className="flex flex-wrap items-center justify-center gap-1"
          >
            {DIGITS.map((n) => {
              const done = finished(n);
              return (
                <button
                  key={n}
                  type="button"
                  aria-label={copy.sudoku.digit(n, Math.max(0, 9 - placed[n]!))}
                  onClick={(e) => enter(picked, n, e.currentTarget)}
                  className={cx(
                    'grid size-11 place-items-center rounded-full font-mono text-[16px] tabular-nums',
                    'transition-[background-color,color,opacity] duration-200 ease-soft hover:bg-paper-soft',
                    done ? 'text-faint' : notesOn ? 'text-muted' : 'text-ink',
                    pickedDigit === n && 'bg-accent/15',
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <div
            role="group"
            aria-label={copy.sudoku.tools}
            className="flex flex-wrap items-center justify-center gap-1"
          >
            <Tool pressed={notesOn} onClick={() => setNotesOn((on) => !on)}>
              {copy.sudoku.notes}
            </Tool>
            <Tool onClick={(el) => erase(picked, el)}>{copy.sudoku.erase}</Tool>
            {onHint ? <Tool onClick={hint}>{copy.solo.hint}</Tool> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

/** a small text pill under the board. pressed ones get the soft tint. */
function Tool({
  pressed,
  onClick,
  children,
}: {
  pressed?: boolean;
  onClick: (el: HTMLButtonElement) => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={(e) => onClick(e.currentTarget)}
      className={cx(
        'inline-flex h-11 items-center rounded-pill px-4 text-[13px] select-none',
        'transition-colors duration-200 ease-soft',
        pressed ? 'bg-ink/[0.07] text-ink' : 'text-muted hover:bg-paper-soft hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

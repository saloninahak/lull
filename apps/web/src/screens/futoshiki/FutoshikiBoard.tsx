import { Fragment, useMemo, useState, type KeyboardEvent } from 'react';
import { futoshikiConflicts, type Sign } from '@lull/game-logic';
import { copy } from '../../copy';
import { cx } from '../../lib/cx';
import { nudge } from '../../lib/nudge';
import { nearestInDirection } from '../../lib/roving';

type BoardProps = {
  size: number;
  puzzle: readonly number[];
  right: readonly Sign[];
  below: readonly Sign[];
  /** your grid, or null when watching */
  grid: readonly number[] | null;
  /** once someone has finished, the answer fills what you left */
  solution: readonly number[] | null;
  onSet: (cell: number, digit: number) => void;
  /** on your own: fill a cell, return which one */
  onHint?: (chosen: number | null) => number | null;
};

/**
 * a small chevron that opens toward the bigger cell. sideways between two
 * cells in a row, up or down between two in a column.
 */
function Chevron({ sign, vertical, broken }: { sign: Sign; vertical: boolean; broken: boolean }) {
  if (!sign) return null;
  // '<' means the first cell (left or top) is the smaller one: the point faces it
  const d = vertical
    ? sign === '<'
      ? 'M 4 13 L 10 6 L 16 13'
      : 'M 4 7 L 10 14 L 16 7'
    : sign === '<'
      ? 'M 13 4 L 6 10 L 13 16'
      : 'M 7 4 L 14 10 L 7 16';
  return (
    <svg viewBox="0 0 20 20" className="size-full" aria-hidden="true" focusable="false">
      <path
        d={d}
        fill="none"
        className={broken ? 'stroke-ink' : 'stroke-muted'}
        strokeWidth={broken ? 2.6 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * the futoshiki grid: rounded cells with the signs in the gaps between
 * them. pick a cell, then a digit. repeats and broken signs tint both
 * cells and the sign darkens, so it's never color alone.
 */
export function FutoshikiBoard({
  size,
  puzzle,
  right,
  below,
  grid,
  solution,
  onSet,
  onHint,
}: BoardProps) {
  const n = size;
  const [picked, setPicked] = useState<number | null>(null);
  const [focus, setFocus] = useState(0);
  const [notesOn, setNotesOn] = useState(false);
  const [notes, setNotes] = useState<number[][]>(() => Array.from({ length: n * n }, () => []));
  const shown = grid ?? puzzle;
  const editable = grid !== null && solution === null;
  const digits = Array.from({ length: n }, (_, i) => i + 1);
  const points = useMemo(
    () => Array.from({ length: n * n }, (_, i) => [i % n, Math.floor(i / n)] as const),
    [n],
  );

  const bad = useMemo(() => {
    const c = futoshikiConflicts(
      { size: n as 4 | 5 | 6, right: [...right], below: [...below] },
      shown,
    );
    return { cells: new Set(c.cells), right: new Set(c.right), below: new Set(c.below) };
  }, [n, right, below, shown]);

  const placed = (d: number) => shown.filter((x) => x === d).length;

  const enter = (cell: number | null, d: number, el: Element | null, asNote = notesOn) => {
    if (cell === null || !editable || puzzle[cell] !== 0) return nudge(el);
    if (asNote) {
      if (shown[cell] !== 0) return nudge(el);
      setNotes((all) =>
        all.map((list, i) =>
          i !== cell ? list : list.includes(d) ? list.filter((x) => x !== d) : [...list, d].sort(),
        ),
      );
      return;
    }
    if (shown[cell] !== d) onSet(cell, d);
  };

  const erase = (cell: number | null, el: Element | null) => {
    if (cell === null || !editable || puzzle[cell] !== 0) return nudge(el);
    if (shown[cell] !== 0) return onSet(cell, 0);
    if (notes[cell]!.length) return setNotes((all) => all.map((l, i) => (i === cell ? [] : l)));
    nudge(el);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const cell = Number(target.dataset.cell);
    if (!Number.isInteger(cell)) return;
    const digit = Number(/^(?:Digit|Numpad)([1-9])$/.exec(e.code)?.[1] ?? 0);
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const next = nearestInDirection(points, cell, e.key);
      setFocus(next);
      setPicked(next);
      (target.parentElement?.querySelector(`[data-cell="${next}"]`) as HTMLElement | null)?.focus();
    } else if (digit >= 1 && digit <= n) {
      e.preventDefault();
      enter(cell, digit, target, notesOn || e.shiftKey);
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      e.preventDefault();
      erase(cell, target);
    } else if (e.key.toLowerCase() === 'n' && editable) {
      e.preventDefault();
      setNotesOn((on) => !on);
    }
  };

  /** the signs around a cell, in words, for its label */
  const around = (c: number) => {
    const r = Math.floor(c / n);
    const k = c % n;
    const out: string[] = [];
    const say = (sign: Sign, mineFirst: boolean, where: string) => {
      if (!sign) return;
      const smaller = (sign === '<') === mineFirst;
      out.push(copy.futoshiki.relation(smaller, where));
    };
    if (k < n - 1) say(right[c]!, true, copy.futoshiki.where.right);
    if (k > 0) say(right[c - 1]!, false, copy.futoshiki.where.left);
    if (r < n - 1) say(below[c]!, true, copy.futoshiki.where.below);
    if (r > 0) say(below[c - n]!, false, copy.futoshiki.where.above);
    return out;
  };

  const track = Array.from({ length: 2 * n - 1 }, (_, i) =>
    i % 2 === 0 ? 'minmax(0,1fr)' : 'minmax(14px,0.32fr)',
  ).join(' ');

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        role="grid"
        aria-label={copy.play.board}
        onKeyDown={onKeyDown}
        className="grid aspect-square w-[min(calc(100vw_-_48px),calc(100dvh_-_500px),400px)] min-w-[260px]"
        style={{ gridTemplateColumns: track, gridTemplateRows: track }}
      >
        {Array.from({ length: n }, (_, r) => (
          <Fragment key={r}>
            {Array.from({ length: n }, (_, k) => {
              const i = r * n + k;
              const given = puzzle[i] !== 0;
              const missing = solution !== null && shown[i] !== solution[i];
              const digit = missing ? solution[i]! : shown[i]!;
              // a note hides itself once its row or column already holds that digit
              const cellNotes =
                digit === 0
                  ? notes[i]!.filter(
                      (d) =>
                        !digits.some((j) => shown[r * n + j - 1] === d) &&
                        !digits.some((j) => shown[(j - 1) * n + k] === d),
                    )
                  : [];
              return (
                <Fragment key={i}>
                  <button
                    type="button"
                    role="gridcell"
                    data-cell={i}
                    tabIndex={i === focus ? 0 : -1}
                    aria-label={copy.futoshiki.cell(r, k, digit, given, cellNotes, around(i))}
                    aria-selected={picked === i}
                    onFocus={() => setFocus(i)}
                    onClick={() => setPicked(i)}
                    style={{ gridRow: r * 2 + 1, gridColumn: k * 2 + 1 }}
                    className={cx(
                      'relative grid place-items-center rounded-md border select-none',
                      'transition-colors duration-150 ease-soft outline-offset-[-3px]',
                      picked === i ? 'border-accent bg-accent/15' : 'border-hairline bg-surface',
                      bad.cells.has(i) && 'bg-ink/[0.08]',
                      editable && !given ? 'cursor-pointer hover:bg-ink/[0.03]' : 'cursor-default',
                    )}
                  >
                    {digit ? (
                      <span
                        className={cx(
                          'font-mono text-[20px] tabular-nums sm:text-[22px]',
                          given ? 'font-semibold text-ink' : missing ? 'text-muted' : 'text-ink/75',
                          bad.cells.has(i) &&
                            !given &&
                            'underline decoration-ink/50 decoration-wavy decoration-1 underline-offset-[5px]',
                        )}
                      >
                        {digit}
                      </span>
                    ) : cellNotes.length ? (
                      <span
                        aria-hidden="true"
                        className="grid size-full grid-cols-3 p-1 font-mono text-[10px] leading-none text-muted"
                      >
                        {digits.map((d) => (
                          <span key={d} className="grid place-items-center">
                            {cellNotes.includes(d) ? d : ''}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </button>
                  {k < n - 1 ? (
                    <span
                      className="grid place-items-center p-0.5"
                      style={{ gridRow: r * 2 + 1, gridColumn: k * 2 + 2 }}
                    >
                      <Chevron sign={right[i]!} vertical={false} broken={bad.right.has(i)} />
                    </span>
                  ) : null}
                  {r < n - 1 ? (
                    <span
                      className="grid place-items-center p-0.5"
                      style={{ gridRow: r * 2 + 2, gridColumn: k * 2 + 1 }}
                    >
                      <Chevron sign={below[i]!} vertical broken={bad.below.has(i)} />
                    </span>
                  ) : null}
                </Fragment>
              );
            })}
          </Fragment>
        ))}
      </div>

      {editable ? (
        <>
          <div
            role="group"
            aria-label={copy.sudoku.digits}
            className="flex flex-wrap items-center justify-center gap-1"
          >
            {digits.map((d) => (
              <button
                key={d}
                type="button"
                aria-label={copy.sudoku.digit(d, Math.max(0, n - placed(d)))}
                onClick={(e) => enter(picked, d, e.currentTarget)}
                className={cx(
                  'grid size-11 place-items-center rounded-full font-mono text-[16px] tabular-nums',
                  'transition-colors duration-200 ease-soft hover:bg-paper-soft',
                  placed(d) >= n ? 'text-faint' : notesOn ? 'text-muted' : 'text-ink',
                )}
              >
                {d}
              </button>
            ))}
          </div>
          <div
            role="group"
            aria-label={copy.sudoku.tools}
            className="flex flex-wrap items-center justify-center gap-1"
          >
            {[
              { label: copy.sudoku.notes, pressed: notesOn, run: () => setNotesOn((o) => !o) },
              { label: copy.sudoku.erase, run: (el: Element) => erase(picked, el) },
              ...(onHint
                ? [
                    {
                      label: copy.solo.hint,
                      run: (el: Element) => {
                        const c = onHint(picked);
                        if (c === null) return nudge(el);
                        setPicked(c);
                        setFocus(c);
                      },
                    },
                  ]
                : []),
            ].map((t) => (
              <button
                key={t.label}
                type="button"
                aria-pressed={'pressed' in t ? t.pressed : undefined}
                onClick={(e) => t.run(e.currentTarget)}
                className={cx(
                  'inline-flex h-11 items-center rounded-pill px-4 text-[13px] select-none',
                  'transition-colors duration-200 ease-soft',
                  'pressed' in t && t.pressed
                    ? 'bg-ink/[0.07] text-ink'
                    : 'text-muted hover:bg-paper-soft hover:text-ink',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

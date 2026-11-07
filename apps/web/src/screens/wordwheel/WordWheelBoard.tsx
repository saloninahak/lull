import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { WordWheelView } from '@lull/game-logic';
import { GhostIconButton } from '../../components/GhostIconButton';
import { ShuffleIcon } from '../../components/icons';
import { copy } from '../../copy';
import { cx } from '../../lib/cx';
import { reveal, settle } from '../../lib/motion';
import { nudge } from '../../lib/nudge';
import { nearestInDirection } from '../../lib/roving';

type BoardProps = {
  view: WordWheelView;
  editable: boolean;
  /** a word spelled on the wheel. `el` is where to nudge if it's turned down. */
  onWord: (word: string, el: HTMLElement | null) => void;
};

/** the wheel's box, the ring the letters sit on, and each letter's circle, in px */
const WHEEL = 264;
const RING = 92;
const LETTER = 56;
/** how close a drag has to come to a letter's middle to pick it */
const REACH = LETTER / 2 - 3;
/** grid squares, in svg units */
const CELL = 100;

/** where spot k of n sits on the ring, starting at the top */
function spot(k: number, n: number): [number, number] {
  const t = ((-90 + (k * 360) / n) * Math.PI) / 180;
  return [WHEEL / 2 + RING * Math.cos(t), WHEEL / 2 + RING * Math.sin(t)];
}

function mixed(order: readonly number[]): number[] {
  for (;;) {
    const next = order.slice();
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j]!, next[i]!];
    }
    if (order.length < 2 || next.some((v, k) => v !== order[k])) return next;
  }
}

/**
 * word wheel: the crossword on one side, the wheel on the other. drag across
 * the letters and let go to send the word; a line in the accent follows
 * you. or click letters one by one, or type them, and press enter.
 */
export function WordWheelBoard({ view, editable, onWord }: BoardProps) {
  const reduce = useReducedMotion();
  const n = view.letters.length;
  /** which letter sits in each spot. the shuffle only changes this. */
  const [order, setOrder] = useState(() => view.letters.map((_, i) => i));
  /** the letters picked so far, in order, as indexes into the wheel */
  const [path, setPath] = useState<number[]>([]);
  const pathRef = useRef<number[]>([]);
  /** a press on the wheel: whether it has moved to another letter yet */
  const press = useRef<{ moved: boolean; onLast: boolean } | null>(null);
  const [pointer, setPointer] = useState<[number, number] | null>(null);
  const [focus, setFocus] = useState(0);
  /** the last word sent, and how many extra words there were before it */
  const [sent, setSent] = useState<{ word: string; extras: number } | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const letterRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const pos = (i: number) => spot(order.indexOf(i), n);
  const word = path.map((i) => view.letters[i]).join('');
  const extras = view.extra?.length ?? 0;

  const update = (p: number[]) => {
    pathRef.current = p;
    setPath(p);
  };

  const send = () => {
    const p = pathRef.current;
    update([]);
    if (p.length === 0) return;
    const w = p.map((i) => view.letters[i]).join('');
    if (w.length < 3) return nudge(wordRef.current);
    setSent({ word: w, extras });
    onWord(w, wordRef.current);
  };

  const local = (e: PointerEvent): [number, number] => {
    const r = wheelRef.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const letterAt = ([x, y]: [number, number]) => {
    for (let i = 0; i < n; i++) {
      const [px, py] = pos(i);
      if (Math.hypot(px - x, py - y) <= REACH) return i;
    }
    return null;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!editable || e.button !== 0) return;
    const xy = local(e);
    const i = letterAt(xy);
    if (i === null) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    // a word started by clicks carries on from where it is
    const p = pathRef.current;
    let onLast = false;
    if (p.length === 0) update([i]);
    else if (p[p.length - 1] === i) onLast = true;
    else if (!p.includes(i)) update([...p, i]);
    press.current = { moved: false, onLast };
    setPointer(xy);
    setSent(null);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const pr = press.current;
    if (!pr) return;
    const xy = local(e);
    setPointer(xy);
    const i = letterAt(xy);
    const p = pathRef.current;
    if (i === null || i === p[p.length - 1]) return;
    pr.moved = true;
    // back over the letter before takes the last one off, like pulling a line back
    if (p.length >= 2 && p[p.length - 2] === i) update(p.slice(0, -1));
    else if (!p.includes(i)) update([...p, i]);
  };

  const onPointerUp = () => {
    const pr = press.current;
    press.current = null;
    setPointer(null);
    if (!pr) return;
    // a swipe sends the word. a click leaves the letter picked, and a click
    // on the last letter again takes it off.
    if (pr.moved) return send();
    if (pr.onLast) update(pathRef.current.slice(0, -1));
  };

  const onPointerCancel = () => {
    press.current = null;
    setPointer(null);
    update([]);
  };

  /** space or enter on a letter, from the keyboard or a screen reader */
  const tap = (i: number, el: HTMLElement) => {
    if (!editable) return nudge(el);
    const p = pathRef.current;
    setSent(null);
    if (p[p.length - 1] === i) update(p.slice(0, -1));
    else if (!p.includes(i)) update([...p, i]);
    else nudge(el);
  };

  const shuffleLetters = () => {
    update([]);
    setOrder(mixed(order));
  };

  const onWheelKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!e.key.startsWith('Arrow')) return;
    const i = Number((e.target as HTMLElement).dataset.letter);
    if (!Number.isInteger(i)) return;
    e.preventDefault();
    const next = nearestInDirection(
      view.letters.map((_, k) => pos(k)),
      i,
      e.key,
    );
    setFocus(next);
    letterRefs.current[next]?.focus();
  };

  // typing spells too: letters pick the first free one on the wheel,
  // backspace takes one off, enter sends, escape lets go
  const typed = useRef<(e: globalThis.KeyboardEvent) => void>(() => {});
  useEffect(() => {
    typed.current = (e) => {
      if (!editable || press.current || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea') || document.querySelector('dialog[open]')) return;
      const p = pathRef.current;
      const key = e.key.toLowerCase();
      if (e.key.length === 1 && /^[a-z]$/.test(key)) {
        e.preventDefault();
        setSent(null);
        const i = view.letters.findIndex((l, k) => l === key && !p.includes(k));
        if (i < 0) return nudge(wordRef.current);
        update([...p, i]);
      } else if (e.key === 'Backspace' && p.length) {
        e.preventDefault();
        update(p.slice(0, -1));
      } else if (e.key === 'Escape' && p.length) {
        update([]);
      } else if (e.key === 'Enter' && p.length) {
        // enter on some other button is that button's
        if (target?.closest('button, a') && !target.closest('[data-wheel], [data-word]')) return;
        e.preventDefault();
        send();
      }
    };
  });
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => typed.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const justExtra =
    sent !== null && view.extra !== null && extras > sent.extras && view.extra.includes(sent.word);
  const sentLanded = sent !== null && (view.found?.includes(sent.word) ?? false);
  const line = [...path.map(pos), ...(pointer ? [pointer] : [])];

  return (
    <div className="flex w-full flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-center lg:gap-20">
      <Grid view={view} reduce={reduce} />

      <div className="flex flex-col items-center gap-3">
        <div ref={wordRef} data-word="" className="flex h-12 items-center justify-center">
          {word ? (
            <button
              type="button"
              onClick={send}
              aria-label={copy.wordwheel.send(word)}
              className="h-11 rounded-pill border border-hairline bg-surface px-5 font-mono text-[22px] tracking-[0.2em] text-ink uppercase transition-colors duration-200 ease-soft hover:bg-paper-soft"
            >
              {word}
            </button>
          ) : sent ? (
            <span
              className={cx(
                'font-mono text-[22px] tracking-[0.2em] uppercase',
                sentLanded ? 'text-ink' : 'text-muted',
              )}
            >
              {sent.word}
            </span>
          ) : (
            <span className="meta">{editable ? copy.wordwheel.start : ''}</span>
          )}
        </div>

        <div
          ref={wheelRef}
          data-wheel=""
          role="group"
          aria-label={copy.wordwheel.wheel}
          onKeyDown={onWheelKey}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          className="relative shrink-0 touch-none select-none"
          style={{ width: WHEEL, height: WHEEL }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full border border-hairline bg-surface shadow-calm"
          />
          <svg
            viewBox={`0 0 ${WHEEL} ${WHEEL}`}
            className="pointer-events-none absolute inset-0 size-full"
            aria-hidden="true"
            focusable="false"
          >
            {line.length > 1 ? (
              <polyline
                points={line.map(([x, y]) => `${x},${y}`).join(' ')}
                fill="none"
                stroke="var(--accent)"
                strokeOpacity={0.45}
                strokeWidth={8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </svg>
          {view.letters.map((l, i) => {
            const [x, y] = pos(i);
            const picked = path.includes(i);
            return (
              <motion.button
                key={i}
                ref={(el: HTMLButtonElement | null) => {
                  letterRefs.current[i] = el;
                }}
                type="button"
                data-letter={i}
                tabIndex={i === focus ? 0 : -1}
                aria-label={copy.wordwheel.letter(l, picked)}
                aria-pressed={picked}
                aria-disabled={!editable}
                onFocus={() => setFocus(i)}
                onClick={(e) => {
                  // keyboard and screen readers. a mouse is handled by the wheel.
                  if (e.detail === 0) tap(i, e.currentTarget);
                }}
                initial={false}
                animate={{
                  x: x - LETTER / 2,
                  y: y - LETTER / 2,
                  scale: picked && !reduce ? 1.06 : 1,
                }}
                transition={reduce ? { duration: 0 } : settle}
                className={cx(
                  'absolute top-0 left-0 grid place-items-center rounded-full font-mono text-[22px] uppercase',
                  'transition-colors duration-150 ease-soft',
                  picked ? 'bg-accent/20 text-ink' : 'text-ink hover:bg-paper-soft',
                  editable ? 'cursor-pointer' : 'cursor-default',
                )}
                style={{ width: LETTER, height: LETTER }}
              >
                {l}
              </motion.button>
            );
          })}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <GhostIconButton
              label={copy.wordwheel.shuffle}
              className="pointer-events-auto"
              disabled={!editable}
              onClick={shuffleLetters}
            >
              <ShuffleIcon />
            </GhostIconButton>
          </div>
        </div>

        <p className="meta h-5 text-center" aria-live="polite">
          {justExtra && sent
            ? copy.wordwheel.extra(sent.word, extras)
            : copy.wordwheel.extras(extras)}
        </p>
      </div>
    </div>
  );
}

/** the crossword. squares stay blank until their letter is yours. */
function Grid({ view, reduce }: { view: WordWheelView; reduce: boolean | null }) {
  const { width, height, slots, shown } = view;
  const px = Math.min(46, Math.floor(400 / Math.max(width, height)));
  // on a phone the squares are smaller, so the grid and the wheel both fit
  const phone = Math.min(32, Math.floor(260 / Math.max(width, height)));
  const open = [...new Set(slots.flatMap((s) => s.cells))];
  const done = new Set(slots.filter((s) => s.done).flatMap((s) => s.cells));
  const hinted = new Set(view.hinted);
  // when a word lands, its letters arrive one after another, in reading order
  const order = new Map<number, number>();
  for (const s of slots) {
    s.cells.forEach((c, i) => {
      if (!order.has(c)) order.set(c, i);
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-center">
      <svg
        role="img"
        aria-label={copy.wordwheel.grid(slots.filter((s) => s.done).length, slots.length)}
        viewBox={`0 0 ${width * CELL} ${height * CELL}`}
        className="h-auto w-[min(var(--grid-phone),calc(100vw-48px))] sm:w-[min(var(--grid),calc(100vw-48px))]"
        style={
          {
            '--grid': `${width * px}px`,
            '--grid-phone': `${width * phone}px`,
          } as CSSProperties
        }
      >
        {open.map((c) => {
          const x = (c % width) * CELL;
          const y = Math.floor(c / width) * CELL;
          const ch = shown[c];
          return (
            <g key={c}>
              <rect
                x={x + 5}
                y={y + 5}
                width={CELL - 10}
                height={CELL - 10}
                rx={16}
                className="fill-surface stroke-hairline"
                strokeWidth={2}
              />
              {done.has(c) ? (
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={reveal}>
                  <rect
                    x={x + 5}
                    y={y + 5}
                    width={CELL - 10}
                    height={CELL - 10}
                    rx={16}
                    className="fill-accent"
                    fillOpacity={0.18}
                  />
                </motion.g>
              ) : null}
              {ch ? (
                <motion.g
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...reveal, delay: reduce ? 0 : (order.get(c) ?? 0) * 0.05 }}
                >
                  <text
                    data-shown=""
                    x={x + CELL / 2}
                    y={y + CELL / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={48}
                    className={cx(
                      'font-mono',
                      // letters that show only because the race is over stay quiet
                      done.has(c) || hinted.has(c) ? 'fill-ink' : 'fill-muted',
                    )}
                  >
                    {ch.toUpperCase()}
                  </text>
                </motion.g>
              ) : null}
            </g>
          );
        })}
      </svg>
      <ul aria-label={copy.wordwheel.slots} className="sr-only">
        {slots.map((s, k) => {
          const label = copy.wordwheel.slot(
            s.cells.map((c) => shown[c] ?? null),
            s.across,
            s.done,
          );
          return (
            <li key={k} aria-label={label}>
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

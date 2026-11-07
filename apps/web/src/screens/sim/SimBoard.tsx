import { useMemo, useState, type KeyboardEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  closesTriangle,
  SIM_EDGES,
  SIM_POINTS,
  simEdge,
  type PlayerColor,
  type SimSeat,
  type SimState,
} from '@lull/game-logic';
import { copy } from '../../copy';
import { cx } from '../../lib/cx';
import { drawIn, stroke } from '../../lib/motion';
import { isKeyboardFocus, useRoving } from '../../lib/roving';

/** six dots on a circle, in a 300-unit square */
const UNITS = 300;
const R = 112;
const C = UNITS / 2;
const POINTS = Array.from({ length: SIM_POINTS }, (_, i) => {
  const a = ((-90 + i * 60) * Math.PI) / 180;
  return [C + R * Math.cos(a), C + R * Math.sin(a)] as const;
});
/** for arrow keys, in the same layout */
const ROVING = POINTS.map(([x, y]) => [x / 100, y / 100] as const);

const lineOf = (edge: number) => {
  const [p, q] = SIM_EDGES[edge]!;
  const [x1, y1] = POINTS[p]!;
  const [x2, y2] = POINTS[q]!;
  return `M ${x1} ${y1} L ${x2} ${y2}`;
};
const triangleOf = (t: readonly number[]) =>
  `M ${t.map((p) => POINTS[p]!.join(' ')).join(' L ')} Z`;

type BoardProps = {
  state: SimState;
  /** the two players' colors, in seat order */
  colors: readonly [PlayerColor, PlayerColor];
  /** changes on every fresh game */
  round: number;
  /** whoever may draw now, or null when this pc can't */
  mover: SimSeat | null;
  onEdge: (edge: number, el: Element | null) => void;
};

/**
 * six small dots and the fifteen faint lines between them. a drawn line
 * takes its player's color (the second player's is dashed too, so color
 * is never the only signal). hovering an open line shows it faintly, and
 * if it would close your own triangle, the triangle shows too.
 */
export function SimBoard({ state, colors, round, mover, onEdge }: BoardProps) {
  const reduce = useReducedMotion();
  const [picked, setPicked] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const { onKeyDown, itemProps } = useRoving(ROVING);
  const over = state.loser !== null;
  const live = mover !== null && !over;

  const openFrom = (p: number) =>
    SIM_EDGES.some(([x, y], e) => (x === p || y === p) && state.edges[e] === null);

  // the line you're about to draw: a hovered line, or from the picked dot to the hovered one
  const ghost = live && hover !== null && state.edges[hover] === null ? hover : null;
  const danger = useMemo(
    () => (ghost !== null && mover !== null ? closesTriangle(state.edges, ghost, mover) : null),
    [ghost, mover, state.edges],
  );

  const tap = (p: number, el: Element | null) => {
    if (!live) return onEdge(-1, el);
    if (picked === null) {
      if (!openFrom(p)) return onEdge(-1, el);
      return setPicked(p);
    }
    if (picked === p) return setPicked(null);
    const edge = simEdge(picked, p);
    setPicked(null);
    setHover(null);
    onEdge(edge, el);
  };

  const onPointKey = (p: number) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      tap(p, e.currentTarget);
    } else if (e.key === 'Escape') {
      setPicked(null);
    }
  };

  const strokeFor = (seat: SimSeat) => ({
    stroke: `var(--${colors[seat]})`,
    strokeDasharray: seat === 1 ? '9 6' : undefined,
  });

  return (
    <svg
      viewBox={`0 0 ${UNITS} ${UNITS}`}
      className="aspect-square w-[min(calc(100vw_-_48px),calc(100dvh_-_440px),420px)] min-w-[264px] touch-manipulation overflow-visible select-none"
      role="group"
      aria-label={copy.play.board}
      onPointerLeave={() => setHover(null)}
    >
      {/* the triangle that lost, or the one you'd make */}
      {over && state.triangle ? (
        <motion.path
          d={triangleOf(state.triangle)}
          fill={`var(--${colors[state.loser!]})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.16 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          aria-hidden="true"
        />
      ) : danger ? (
        <path d={triangleOf(danger)} className="fill-ink" opacity={0.06} aria-hidden="true" />
      ) : null}

      {/* every line, faint until someone draws it */}
      <g aria-hidden="true" fill="none" strokeLinecap="round">
        {SIM_EDGES.map((_, e) => (
          <path key={e} d={lineOf(e)} className="stroke-faint" strokeWidth={1} opacity={0.6} />
        ))}
      </g>

      {/* drawn lines. the newest draws itself in. */}
      <g key={round} aria-hidden="true" fill="none" strokeLinecap="round">
        {state.edges.map((seat, e) => {
          if (seat === null) return null;
          const inTriangle =
            over &&
            state.triangle !== null &&
            SIM_EDGES[e]!.every((p) => state.triangle!.includes(p));
          const props = { d: lineOf(e), strokeWidth: inTriangle ? 4.5 : 3, ...strokeFor(seat) };
          if (e !== state.last) return <path key={e} {...props} />;
          // drawing in works through the dash pattern, so a dashed line fades in instead
          return seat === 0 ? (
            <motion.path key={e} {...props} {...drawIn(reduce, stroke(0.22))} />
          ) : (
            <motion.path
              key={e}
              {...props}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.22 }}
            />
          );
        })}
      </g>

      {/* the faint ghost of the line you'd draw */}
      {ghost !== null && mover !== null ? (
        <path
          d={lineOf(ghost)}
          fill="none"
          strokeLinecap="round"
          strokeWidth={3}
          opacity={danger ? 0.55 : 0.35}
          className="pointer-events-none"
          aria-hidden="true"
          {...strokeFor(mover)}
        />
      ) : null}

      {/* lines as wide, invisible tap areas. not in the tab order: the dots are. */}
      <g>
        {SIM_EDGES.map(([p, q], e) => {
          const seat = state.edges[e];
          const open = seat === null && live;
          return (
            <path
              key={e}
              d={lineOf(e)}
              role="button"
              tabIndex={-1}
              aria-label={copy.sim.line(p + 1, q + 1, seat == null ? null : copy.sim.owner(seat))}
              aria-disabled={!open}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              strokeLinecap="round"
              pointerEvents="stroke"
              className={cx('outline-none', open ? 'cursor-pointer' : 'cursor-default')}
              onPointerEnter={() => setHover(open ? e : null)}
              onClick={(ev) => {
                setPicked(null);
                onEdge(open ? e : -1, ev.currentTarget);
              }}
            />
          );
        })}
      </g>

      {/* the dots, with a ring when picked or focused */}
      <g onKeyDown={onKeyDown}>
        {POINTS.map(([x, y], p) => {
          const item = itemProps(p);
          return (
            <g key={p}>
              {picked === p ? (
                <circle
                  cx={x}
                  cy={y}
                  r={15}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              ) : null}
              {focused === p ? (
                <circle
                  cx={x}
                  cy={y}
                  r={19}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  opacity={0.8}
                  aria-hidden="true"
                />
              ) : null}
              <circle cx={x} cy={y} r={6.5} className="fill-ink" aria-hidden="true" />
              <circle
                cx={x}
                cy={y}
                r={22}
                role="button"
                aria-label={copy.sim.point(p + 1, picked === p)}
                aria-pressed={picked === p}
                aria-disabled={!live}
                tabIndex={item.tabIndex}
                ref={item.ref}
                fill="transparent"
                className={cx('outline-none', live ? 'cursor-pointer' : 'cursor-default')}
                onPointerEnter={() =>
                  setHover(picked !== null && picked !== p ? simEdge(picked, p) : null)
                }
                onClick={(ev) => tap(p, ev.currentTarget)}
                onKeyDown={onPointKey(p)}
                onFocus={(ev) => {
                  item.onFocus();
                  if (isKeyboardFocus(ev.currentTarget)) setFocused(p);
                  if (picked !== null && picked !== p) setHover(simEdge(picked, p));
                }}
                onBlur={() => setFocused((f) => (f === p ? null : f))}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  boxCount,
  dangerBoxes,
  edgeAt,
  edgeCount,
  type DotsState,
  type PlayerColor,
} from '@lull/game-logic';
import { copy } from '../../copy';
import { drawIn, softSettle, stroke } from '../../lib/motion';
import { isKeyboardFocus, useRoving } from '../../lib/roving';

/** spacing between dots in board units */
const S = 60;

type Seat = { name: string; color: PlayerColor };

type BoardProps = {
  state: DotsState;
  seats: readonly Seat[];
  round: number;
  /** in a room, only on your own turn. the ghost line follows it. */
  interactive?: boolean;
  onEdge: (edge: number, el: Element | null) => void;
};

type Geometry = {
  /** the two dots an edge joins */
  ends: Array<readonly [number, number, number, number]>;
  /** the diamond each edge owns for taps: its two dots and the two box centers */
  hit: string[];
  /** a smaller diamond, drawn as the keyboard focus ring */
  ring: string[];
  /** edge midpoints in dot units, for arrow-key focus */
  mids: Array<readonly [number, number]>;
};

/** a diamond around (mx, my): `along` toward the dots, `across` toward the boxes */
function diamond(kind: 'h' | 'v', mx: number, my: number, along: number, across: number) {
  return kind === 'h'
    ? `${mx - along},${my} ${mx},${my - across} ${mx + along},${my} ${mx},${my + across}`
    : `${mx},${my - along} ${mx - across},${my} ${mx},${my + along} ${mx + across},${my}`;
}

function geometry(size: number): Geometry {
  const ends: Geometry['ends'] = [];
  const hit: string[] = [];
  const ring: string[] = [];
  const mids: Geometry['mids'] = [];
  for (let e = 0; e < edgeCount(size); e++) {
    const { kind, row, col } = edgeAt(size, e);
    const x1 = col * S;
    const y1 = row * S;
    const x2 = kind === 'h' ? x1 + S : x1;
    const y2 = kind === 'h' ? y1 : y1 + S;
    ends.push([x1, y1, x2, y2]);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    hit.push(diamond(kind, mx, my, S / 2, S / 2));
    ring.push(diamond(kind, mx, my, S * 0.4, S * 0.22));
    mids.push([mx / S, my / S]);
  }
  return { ends, hit, ring, mids };
}

/**
 * small dots, thin lines (readme 7.2). each edge owns a diamond-shaped tap
 * area that is much larger than its visible line (readme 5.4).
 */
export function DotsBoard({ state, seats, round, interactive = true, onEdge }: BoardProps) {
  const { size } = state;
  const reduce = useReducedMotion();
  const geo = useMemo(() => geometry(size), [size]);
  const { onKeyDown, itemProps } = useRoving(geo.mids);
  const lineRefs = useRef<Array<SVGPathElement | null>>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);

  const over = state.boxes.every((b) => b !== null);
  const danger = new Set(dangerBoxes(state));
  const mover = seats[state.turn];

  // units per css pixel, so strokes stay about the same width at every size
  const W = size * S;
  const k = W / 340;
  // thin pencil lines, small dots
  const lineW = 1.9 * k;
  const dotR = 3.2 * k;

  const color = (seat: number) => `var(--${seats[seat]?.color ?? 'graphite'})`;
  const lastEdge = state.last?.edge ?? null;
  const claimedNow = new Set(state.last?.claimed ?? []);

  const press = (e: number) => onEdge(e, lineRefs.current[e] ?? null);

  const onItemKey = (e: number) => (ev: KeyboardEvent) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      press(e);
    }
  };

  const ghost = over || !interactive ? null : (focused ?? hover);
  const ghostEnds = ghost !== null && state.edges[ghost] === null ? geo.ends[ghost] : undefined;

  return (
    <svg
      viewBox={`${-S / 2} ${-S / 2} ${W} ${W}`}
      className="aspect-square w-[min(calc(100vw_-_48px),calc(100dvh_-_440px),420px)] min-w-[264px] touch-manipulation overflow-visible select-none"
      role="group"
      aria-label={copy.play.board}
    >
      {/* boxes: a barely-there tint at three sides, a soft fill once claimed */}
      {Array.from({ length: boxCount(size) }, (_, b) => {
        const row = Math.floor(b / (size - 1));
        const col = b % (size - 1);
        const x = col * S;
        const y = row * S;
        const owner = state.boxes[b];
        const inset = 5 * k;
        return (
          <g key={b} aria-hidden="true">
            <rect
              x={x + inset}
              y={y + inset}
              width={S - inset * 2}
              height={S - inset * 2}
              rx={4 * k}
              className="fill-ink transition-opacity duration-500 ease-soft"
              style={{ opacity: owner === null && danger.has(b) ? 0.04 : 0 }}
            />
            {owner !== null && owner !== undefined ? (
              <g key={`${round}-${b}`}>
                <motion.rect
                  x={x + inset}
                  y={y + inset}
                  width={S - inset * 2}
                  height={S - inset * 2}
                  rx={4 * k}
                  fill={color(owner)}
                  fillOpacity={0.2}
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                  initial={claimedNow.has(b) ? { scale: 0.15, opacity: 0 } : false}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    ...softSettle,
                    delay: 0.16,
                    opacity: { duration: 0.2, delay: 0.16 },
                  }}
                />
                <motion.text
                  x={x + S / 2}
                  y={y + S / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={color(owner)}
                  className="font-mono"
                  fontSize={S * 0.26}
                  initial={claimedNow.has(b) ? { opacity: 0 } : false}
                  animate={{ opacity: 0.9 }}
                  transition={{ duration: 0.24, delay: 0.3 }}
                >
                  {seats[owner]?.name}
                </motion.text>
              </g>
            ) : null}
          </g>
        );
      })}

      {/* drawn lines. the newest one keeps its player's color. */}
      <g fill="none" strokeLinecap="round" aria-hidden="true">
        {state.edges.map((owner, e) => {
          if (owner === null) return null;
          const [x1, y1, x2, y2] = geo.ends[e]!;
          const isLast = e === lastEdge;
          return (
            <motion.path
              key={`${round}-${e}`}
              ref={(el: SVGPathElement | null) => {
                lineRefs.current[e] = el;
              }}
              d={`M ${x1} ${y1} L ${x2} ${y2}`}
              strokeWidth={lineW}
              style={{ stroke: isLast ? color(owner) : 'var(--text)', transition: 'stroke 0.4s' }}
              {...drawIn(reduce, stroke(0.2))}
            />
          );
        })}
      </g>

      {/* the faint ghost of the line you are about to draw */}
      {ghostEnds && mover ? (
        <path
          aria-hidden="true"
          className="pointer-events-none"
          d={`M ${ghostEnds[0]} ${ghostEnds[1]} L ${ghostEnds[2]} ${ghostEnds[3]}`}
          strokeWidth={lineW}
          strokeLinecap="round"
          style={{ stroke: `var(--${mover.color})` }}
          opacity={focused !== null ? 0.5 : 0.3}
        />
      ) : null}

      {/* dots on top of the lines */}
      <g className="fill-ink" aria-hidden="true">
        {Array.from({ length: size * size }, (_, i) => (
          <circle key={i} cx={(i % size) * S} cy={Math.floor(i / size) * S} r={dotR} />
        ))}
      </g>

      {/* tap areas, one diamond per edge */}
      <g onKeyDown={onKeyDown}>
        {geo.hit.map((points, e) => {
          const owner = state.edges[e] ?? null;
          const { kind, row, col } = edgeAt(size, e);
          const roving = itemProps(e);
          return (
            <polygon
              key={e}
              points={points}
              role="button"
              aria-label={copy.dots.edge(
                kind,
                row,
                col,
                owner === null ? null : (seats[owner]?.name ?? null),
              )}
              aria-disabled={over || owner !== null}
              tabIndex={roving.tabIndex}
              ref={roving.ref}
              fill="transparent"
              className={owner === null && !over ? 'cursor-pointer outline-none' : 'outline-none'}
              onClick={() => press(e)}
              onKeyDown={onItemKey(e)}
              onPointerEnter={(ev) => ev.pointerType === 'mouse' && setHover(e)}
              onPointerLeave={() => setHover((h) => (h === e ? null : h))}
              onFocus={(ev) => {
                roving.onFocus();
                if (isKeyboardFocus(ev.currentTarget)) setFocused(e);
              }}
              onBlur={() => setFocused((f) => (f === e ? null : f))}
            />
          );
        })}
      </g>

      {/* keyboard focus, in the accent */}
      {focused !== null ? (
        <polygon
          aria-hidden="true"
          points={geo.ring[focused]}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.75 * k}
          strokeLinejoin="round"
          className="pointer-events-none"
        />
      ) : null}
    </svg>
  );
}

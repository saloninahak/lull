import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { CANVAS, type Stroke, type StrokeWidth } from '@lull/game-logic';
import { copy } from '../../copy';
import { cx } from '../../lib/cx';

/** a piece of a line goes out this often while drawing */
const FLUSH_MS = 90;
/** numbers per piece. the rules take up to 120, and a message stays under 2KB */
const PIECE = 100;
/** points closer than this to the last one are skipped */
const MIN_STEP = 5;
/** line widths in canvas units: thin, thick, and a broad eraser */
const WIDTH: Record<StrokeWidth, number> = { 1: 6, 2: 16, 3: 48 };
/** the eraser draws in the paper's own color */
const inkOf = (w: StrokeWidth) => (w === 3 ? 'var(--surface)' : 'var(--text)');

type Piece = { pts: number[]; cont: boolean; w: StrokeWidth };

type CanvasProps = {
  strokes: readonly Stroke[];
  /** only the drawer, while drawing */
  interactive: boolean;
  /** the pen the next line is drawn with */
  pen?: StrokeWidth;
  onPiece: (piece: Piece) => void;
  /** a tiny note in the paper's corner, like a page number */
  corner?: string;
  /** shown over the paper, e.g. the word choices */
  children?: ReactNode;
};

function pathOf(pts: readonly number[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0]} ${pts[1]}`;
  // a single point still shows, as a dot
  if (pts.length === 2) return `${d} L ${pts[0]} ${pts[1]}`;
  for (let i = 2; i + 1 < pts.length; i += 2) d += ` L ${pts[i]} ${pts[i + 1]}`;
  return d;
}

/**
 * plain ink on the paper. the drawer's line is drawn here straight away and
 * goes out in small pieces, so everyone else watches it appear.
 */
export function DrawCanvas({
  strokes,
  interactive,
  pen = 1,
  onPiece,
  corner,
  children,
}: CanvasProps) {
  const box = useRef<HTMLDivElement>(null);
  /** the line being drawn here, and where it sits among the server's lines */
  const [local, setLocal] = useState<{
    start: number;
    pts: number[];
    w: StrokeWidth;
    done: boolean;
  } | null>(null);
  const width = useRef<StrokeWidth>(pen);
  const pending = useRef<number[]>([]);
  /** every point of the line being drawn, ahead of any render */
  const drawn = useRef<number[] | null>(null);
  const sentFirst = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  const flush = () => {
    const pts = pending.current;
    if (pts.length === 0) return;
    for (let i = 0; i < pts.length; i += PIECE) {
      onPiece({ pts: pts.slice(i, i + PIECE), cont: sentFirst.current, w: width.current });
      sentFirst.current = true;
    }
    pending.current = [];
  };

  useEffect(() => () => window.clearInterval(timer.current), []);

  // once the server has the whole line, its copy takes over
  const echoed = local?.done && (strokes[local.start]?.pts.length ?? 0) >= local.pts.length;
  useEffect(() => {
    if (!local?.done) return;
    const id = window.setTimeout(() => setLocal(null), echoed ? 0 : 1500);
    return () => window.clearTimeout(id);
  }, [local?.done, echoed]);

  const toCanvas = (e: PointerEvent): [number, number] | null => {
    const r = box.current?.getBoundingClientRect();
    if (!r || r.width === 0) return null;
    const clamp = (v: number) => Math.max(0, Math.min(CANVAS, Math.round(v)));
    return [
      clamp(((e.clientX - r.left) / r.width) * CANVAS),
      clamp(((e.clientY - r.top) / r.height) * CANVAS),
    ];
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!interactive || e.button !== 0) return;
    const p = toCanvas(e);
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    sentFirst.current = false;
    width.current = pen;
    pending.current = [...p];
    drawn.current = [...p];
    const start = strokes.length;
    setLocal({ start, pts: [...p], w: pen, done: false });
    flush();
    window.clearInterval(timer.current);
    timer.current = window.setInterval(flush, FLUSH_MS);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const pts = drawn.current;
    if (!pts) return;
    const p = toCanvas(e);
    if (!p) return;
    const n = pts.length;
    if (Math.hypot(p[0] - pts[n - 2]!, p[1] - pts[n - 1]!) < MIN_STEP) return;
    pts.push(...p);
    pending.current.push(...p);
    const copyOf = [...pts];
    setLocal((prev) => (prev ? { ...prev, pts: copyOf } : prev));
  };

  const onPointerUp = () => {
    if (!drawn.current) return;
    drawn.current = null;
    window.clearInterval(timer.current);
    flush();
    setLocal((prev) => (prev ? { ...prev, done: true } : prev));
  };

  const shown: readonly Stroke[] = local
    ? [...strokes.slice(0, local.start), { w: local.w, pts: local.pts }]
    : strokes;

  return (
    <div
      ref={box}
      data-canvas=""
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cx(
        'relative aspect-square min-w-[280px] shrink-0',
        'w-[min(calc(100vw_-_48px),calc(100dvh_-_500px),520px)] lg:w-[min(calc(100dvh_-_430px),560px)]',
        'touch-none overflow-hidden rounded-lg border border-hairline bg-surface shadow-calm select-none',
        interactive ? 'cursor-crosshair' : 'cursor-default',
      )}
    >
      <svg
        viewBox={`0 0 ${CANVAS} ${CANVAS}`}
        className="pointer-events-none absolute inset-0 size-full"
        role="img"
        aria-label={copy.draw.canvas}
        focusable="false"
      >
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {shown.map((s, i) => (
            <path key={i} d={pathOf(s.pts)} stroke={inkOf(s.w)} strokeWidth={WIDTH[s.w]} />
          ))}
        </g>
      </svg>
      {corner ? (
        <span className="meta pointer-events-none absolute top-4 left-5">{corner}</span>
      ) : null}
      {children ? (
        <div className="absolute inset-0 flex items-center justify-center p-6">{children}</div>
      ) : null}
    </div>
  );
}

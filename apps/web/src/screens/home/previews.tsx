/**
 * tiny static previews for the home cards. each uses only its game's accent
 * plus neutrals. step 8 turns these into slow idle loops.
 * decorative: the card title carries the meaning.
 */

const line = 'stroke-faint';

export function TicTacToePreview() {
  return (
    <svg viewBox="0 0 90 90" className="h-full w-auto" aria-hidden="true" focusable="false">
      <g className={line} strokeWidth="1.25" strokeLinecap="round">
        <path d="M32 10v70M58 10v70M10 32h70M10 58h70" />
      </g>
      <g className="stroke-blue" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M14 14l12 12M26 14L14 26" />
        <path d="M40 40l10 10M50 40L40 50" />
      </g>
      <g className="stroke-graphite" strokeWidth="2.5" fill="none">
        <circle cx="71" cy="20" r="6.5" />
        <circle cx="20" cy="71" r="6.5" />
      </g>
    </svg>
  );
}

export function DotsPreview() {
  const points = [12, 38, 64, 90];
  return (
    <svg viewBox="0 0 102 102" className="h-full w-auto" aria-hidden="true" focusable="false">
      <rect x="38" y="38" width="26" height="26" rx="3" className="fill-amber" fillOpacity="0.18" />
      <g className="stroke-ink" strokeWidth="2" strokeLinecap="round">
        <path d="M38 38h26M38 64h26M38 38v26M64 38v26" />
        <path d="M12 12h26M64 90h26M90 38v26" opacity="0.35" />
      </g>
      <g className="fill-ink">
        {points.map((y) => points.map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.25" />))}
      </g>
    </svg>
  );
}

export function MorrisPreview() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-auto" aria-hidden="true" focusable="false">
      <g className={line} strokeWidth="1.25" fill="none">
        <rect x="8" y="8" width="84" height="84" />
        <rect x="24" y="24" width="52" height="52" />
        <rect x="40" y="40" width="20" height="20" />
        <path d="M50 8v32M50 60v32M8 50h32M60 50h32" />
      </g>
      <path d="M8 8h84" className="stroke-red" strokeWidth="1.5" strokeOpacity="0.5" />
      <g className="fill-red">
        <circle cx="8" cy="8" r="5" />
        <circle cx="50" cy="8" r="5" />
        <circle cx="92" cy="8" r="5" />
      </g>
      <g className="fill-graphite">
        <circle cx="24" cy="76" r="5" />
        <circle cx="60" cy="50" r="5" />
      </g>
    </svg>
  );
}

export function BingoPreview() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2" aria-hidden="true">
      <span className="display text-[56px] tracking-[-0.03em]">17</span>
      <span className="mt-1 flex items-center gap-2 font-mono text-[12px] tracking-[0.04em]">
        {['b', 'i', 'n', 'g', 'o'].map((l, i) => (
          <span key={l} className={i < 2 ? 'relative text-ink' : 'text-muted'}>
            {l}
            {i < 2 ? (
              <span className="absolute inset-x-[-2px] top-1/2 h-px rounded-full bg-green" />
            ) : null}
          </span>
        ))}
      </span>
    </div>
  );
}

const svg = { className: 'h-full w-auto', 'aria-hidden': true, focusable: 'false' } as const;

export function Connect4Preview() {
  const filled: Record<string, 'a' | 'b'> = {
    '0-5': 'a',
    '1-5': 'b',
    '1-4': 'a',
    '2-5': 'b',
    '2-4': 'b',
    '2-3': 'a',
    '3-5': 'a',
    '3-4': 'b',
    '3-3': 'b',
    '3-2': 'a',
  };
  return (
    <svg viewBox="0 0 98 86" {...svg}>
      {Array.from({ length: 7 * 6 }, (_, i) => {
        const c = i % 7;
        const r = Math.floor(i / 7);
        const who = filled[`${c}-${r}`];
        return (
          <circle
            key={i}
            cx={9 + c * 13.3}
            cy={9 + r * 13.6}
            r="5"
            className={
              who === 'a' ? 'fill-red' : who === 'b' ? 'fill-graphite' : 'fill-none stroke-faint'
            }
            strokeWidth="1"
          />
        );
      })}
    </svg>
  );
}

export function SkribblPreview() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3" aria-hidden="true">
      <svg viewBox="0 0 90 60" className="h-20 w-auto">
        <path
          d="M10 48 C 20 18, 34 14, 44 30 S 70 46, 80 14"
          className="fill-none stroke-ink"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="66" cy="20" r="7" className="fill-none stroke-ink" strokeWidth="2" />
      </svg>
      <span className="font-mono text-[12px] tracking-[0.3em] text-muted">
        _ _ <span className="text-blue">o</span> _ _
      </span>
    </div>
  );
}

export function PictionaryPreview() {
  return (
    <svg viewBox="0 0 90 70" {...svg}>
      <g
        className="fill-none stroke-ink"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 56 L 45 18 L 72 56 Z" />
        <path d="M34 56 V 42 H 46 V 56" />
      </g>
      <circle cx="72" cy="16" r="5" className="fill-amber" />
    </svg>
  );
}

export function WordChainPreview() {
  return (
    <div
      className="flex h-full flex-col items-start justify-center gap-1.5 font-mono text-[14px]"
      aria-hidden="true"
    >
      <span className="text-muted">
        app<span className="text-ink">le</span>
      </span>
      <span className="pl-6 text-muted">
        <span className="text-green">e</span>ag<span className="text-ink">le</span>
      </span>
      <span className="pl-12">
        <span className="text-green">e</span>mber
      </span>
    </div>
  );
}

export function HangmanPreview() {
  return (
    <div className="flex h-full items-center justify-center gap-6" aria-hidden="true">
      <svg viewBox="0 0 50 70" className="h-24 w-auto">
        <g className="fill-none stroke-faint" strokeWidth="1.5" strokeLinecap="round">
          <path d="M6 66 H 30 M 14 66 V 6 H 36 V 14" />
        </g>
        <g className="fill-none stroke-blue" strokeWidth="2" strokeLinecap="round">
          <circle cx="36" cy="20" r="6" />
          <path d="M36 26 V 42 M 36 31 L 29 37" />
        </g>
      </svg>
      <span className="font-mono text-[15px] tracking-[0.25em]">c_k_</span>
    </div>
  );
}

export function RpsPreview() {
  return (
    <div className="flex h-full items-center justify-center gap-5" aria-hidden="true">
      {(['rock', 'paper', 'scissors'] as const).map((t, i) => (
        <span
          key={t}
          className={`flex size-14 items-center justify-center rounded-full border text-[11px] tracking-[0.02em] ${
            i === 1 ? 'border-amber text-ink' : 'border-hairline text-muted'
          }`}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

export function SudokuPreview() {
  const digits = [5, 3, 0, 6, 0, 0, 0, 9, 8];
  return (
    <svg viewBox="0 0 66 66" {...svg}>
      <rect
        x="3"
        y="3"
        width="60"
        height="60"
        rx="3"
        className="fill-none stroke-faint"
        strokeWidth="1"
      />
      <path d="M23 3v60M43 3v60M3 23h60M3 43h60" className="stroke-faint" strokeWidth="1" />
      {digits.map((d, i) =>
        d ? (
          <text
            key={i}
            x={13 + (i % 3) * 20}
            y={18 + Math.floor(i / 3) * 20}
            textAnchor="middle"
            className={`font-mono ${i === 7 ? 'fill-green' : 'fill-ink'}`}
            fontSize="11"
          >
            {d}
          </text>
        ) : null,
      )}
    </svg>
  );
}

export function ZipPreview() {
  // a short line through a 4x4 grid, passing 1, 2, 3
  const cells = [0, 1, 5, 4, 8, 9, 10, 6, 2, 3];
  const at = (c: number) => [12 + (c % 4) * 22, 12 + Math.floor(c / 4) * 22] as const;
  const d = cells.map((c, i) => `${i ? 'L' : 'M'} ${at(c)[0]} ${at(c)[1]}`).join(' ');
  const nums: Record<number, number> = { 0: 1, 10: 2, 3: 3 };
  return (
    <svg viewBox="0 0 90 90" {...svg}>
      {Array.from({ length: 16 }, (_, i) => (
        <circle key={i} cx={at(i)[0]} cy={at(i)[1]} r="1.5" className="fill-faint" />
      ))}
      <path
        d={d}
        className="fill-none stroke-red"
        strokeOpacity="0.55"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {Object.entries(nums).map(([c, n]) => (
        <g key={c}>
          <circle cx={at(+c)[0]} cy={at(+c)[1]} r="7" className="fill-ink" />
          <text
            x={at(+c)[0]}
            y={at(+c)[1] + 3.5}
            textAnchor="middle"
            fontSize="9"
            className="fill-paper font-mono"
          >
            {n}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function NpatPreview() {
  const rows = [
    ['name', 'bob'],
    ['place', 'bali'],
    ['animal', 'bear'],
    ['thing', 'ball'],
  ] as const;
  return (
    <div className="flex h-full items-center justify-center gap-6" aria-hidden="true">
      <span className="display text-[56px] text-blue">b</span>
      <span className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 font-mono text-[12px]">
        {rows.map(([label, word]) => (
          <span key={label} className="contents">
            <span className="text-muted">{label}</span>
            <span className="text-ink">{word}</span>
          </span>
        ))}
      </span>
    </div>
  );
}

export function SimPreview() {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    return [50 + 38 * Math.cos(a), 50 + 38 * Math.sin(a)] as const;
  });
  const seg = (p: number, q: number) => `M ${pts[p]!.join(' ')} L ${pts[q]!.join(' ')}`;
  return (
    <svg viewBox="0 0 100 100" className="h-full w-auto" aria-hidden="true" focusable="false">
      <g className={line} strokeWidth="0.8" opacity="0.7">
        {pts.flatMap((_, p) =>
          pts.map((__, q) => (q > p ? <path key={`${p}-${q}`} d={seg(p, q)} /> : null)),
        )}
      </g>
      <g fill="none" strokeWidth="2.2" strokeLinecap="round">
        <path d={`${seg(0, 1)} ${seg(1, 3)}`} className="stroke-amber" />
        <path d={`${seg(2, 4)} ${seg(4, 5)}`} className="stroke-graphite" strokeDasharray="5 3.5" />
      </g>
      <g className="fill-ink">
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.6" />
        ))}
      </g>
    </svg>
  );
}

export function WordSearchPreview() {
  const rows = ['dkcat', 'oxlrw', 'gpsun', 'bmoeq', 'sfisw'];
  const at = (r: number, c: number) => [12 + c * 19, 14 + r * 19] as const;
  return (
    <svg viewBox="0 0 100 100" className="h-full w-auto" aria-hidden="true" focusable="false">
      <path
        d={`M ${at(0, 2).join(' ')} L ${at(0, 4).join(' ')}`}
        className="stroke-green"
        strokeOpacity="0.3"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <path
        d={`M ${at(2, 2).join(' ')} L ${at(2, 4).join(' ')}`}
        className="stroke-green"
        strokeOpacity="0.3"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <g className="fill-ink font-mono" fontSize="11" textAnchor="middle">
        {rows.flatMap((row, r) =>
          [...row].map((ch, c) => (
            <text key={`${r}-${c}`} x={at(r, c)[0]} y={at(r, c)[1] + 4}>
              {ch}
            </text>
          )),
        )}
      </g>
    </svg>
  );
}

export function FutoshikiPreview() {
  const cells = [
    [2, 0, 1],
    [0, 3, 0],
    [1, 0, 0],
  ];
  return (
    <svg viewBox="0 0 100 100" className="h-full w-auto" aria-hidden="true" focusable="false">
      {cells.flatMap((row, r) =>
        row.map((d, c) => (
          <g key={`${r}-${c}`}>
            <rect
              x={8 + c * 32}
              y={8 + r * 32}
              width="22"
              height="22"
              rx="5"
              className="fill-surface stroke-faint"
              strokeWidth="1"
            />
            {d ? (
              <text
                x={19 + c * 32}
                y={23 + r * 32}
                textAnchor="middle"
                fontSize="11"
                className="fill-ink font-mono"
              >
                {d}
              </text>
            ) : null}
          </g>
        )),
      )}
      <g fill="none" className="stroke-red" strokeWidth="1.6" strokeLinecap="round">
        <path d="M 37 15 L 33 19 L 37 23" />
        <path d="M 66 47 L 70 51 L 66 55" />
        <path d="M 16 70 L 19 66 L 22 70" />
      </g>
    </svg>
  );
}

export function ConsequencesPreview() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-auto" aria-hidden="true" focusable="false">
      <rect x="22" y="10" width="56" height="80" rx="4" className="fill-surface stroke-faint" />
      <g className="stroke-faint" strokeWidth="1" strokeDasharray="3 2.5">
        <path d="M 22 34 H 78" />
        <path d="M 22 56 H 78" />
      </g>
      <g strokeLinecap="round" strokeWidth="2.4">
        <path d="M 30 22 H 62" className="stroke-graphite" opacity="0.25" />
        <path d="M 30 45 H 66" className="stroke-graphite" opacity="0.25" />
        <path d="M 30 68 H 58" className="stroke-blue" />
        <path d="M 30 78 H 48" className="stroke-blue" opacity="0.5" />
      </g>
    </svg>
  );
}

export function OneStoryPreview() {
  const words = ['once', 'upon', 'a', 'small', 'and'];
  return (
    <p
      className="max-w-[180px] text-center text-[15px] leading-relaxed text-ink"
      aria-hidden="true"
    >
      {words.map((w, i) => (
        <span key={w} className={i === words.length - 1 ? 'text-amber' : undefined}>
          {w}{' '}
        </span>
      ))}
      <span className="text-faint">…</span>
    </p>
  );
}

export function WordWheelPreview() {
  // the grid on the left, the wheel on the right, like the game. heat runs
  // down and is filled in; art crosses it at the a and is being swiped.
  const step = 12.5;
  const at = (r: number, c: number) => [2 + c * step, 26 + r * step] as const;
  const squares = [
    { r: 0, c: 1, ch: 'h', done: true },
    { r: 1, c: 1, ch: 'e', done: true },
    { r: 2, c: 1, ch: 'a', done: true },
    { r: 3, c: 1, ch: 't', done: true },
    { r: 2, c: 2, ch: '', done: false },
    { r: 2, c: 3, ch: '', done: false },
  ];
  const wheel = ['h', 'e', 'a', 'r', 't'].map((ch, k) => {
    const t = ((-90 + k * 72) * Math.PI) / 180;
    return { ch, x: 77 + 13 * Math.cos(t), y: 50 + 13 * Math.sin(t) };
  });
  const swipe = [2, 3, 4].map((k) => `${wheel[k]!.x} ${wheel[k]!.y}`).join(' L ');
  return (
    // cropped to the drawing, so it fills the card like the other previews
    <svg
      viewBox="0 24 100 54"
      className="h-auto w-[170px] sm:w-[230px]"
      aria-hidden="true"
      focusable="false"
    >
      <g strokeWidth="0.7">
        {squares.map(({ r, c, done }) => (
          <rect
            key={`${r}-${c}`}
            x={at(r, c)[0]}
            y={at(r, c)[1]}
            width="11"
            height="11"
            rx="2.4"
            className={done ? 'fill-green stroke-faint' : 'fill-surface stroke-faint'}
            fillOpacity={done ? 0.18 : 1}
          />
        ))}
      </g>
      <g className="fill-ink font-mono" fontSize="7.5" textAnchor="middle">
        {squares.map(({ r, c, ch }) =>
          ch ? (
            <text key={`${r}-${c}`} x={at(r, c)[0] + 5.5} y={at(r, c)[1] + 8.2}>
              {ch}
            </text>
          ) : null,
        )}
      </g>
      <circle cx="77" cy="50" r="21" className="fill-surface stroke-faint" strokeWidth="0.7" />
      <path
        d={`M ${swipe}`}
        fill="none"
        className="stroke-green"
        strokeOpacity="0.5"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g className="fill-ink font-mono" fontSize="7.5" textAnchor="middle">
        {wheel.map((w) => (
          <text key={w.ch} x={w.x} y={w.y + 2.6}>
            {w.ch}
          </text>
        ))}
      </g>
    </svg>
  );
}

import type { CSSProperties, SVGProps } from 'react';

/**
 * hand-drawn line icons. one stroke weight, round caps, sized by the parent
 * font size (1em). decorative by default; the button carries the label.
 */

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="10" cy="10" r="3.25" />
      <path d="M10 2.5v1.5M10 16v1.5M2.5 10H4M16 10h1.5M4.7 4.7l1.06 1.06M14.24 14.24l1.06 1.06M4.7 15.3l1.06-1.06M14.24 5.76l1.06-1.06" />
    </Base>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M15.5 12.3A6 6 0 0 1 7.7 4.5a6 6 0 1 0 7.8 7.8Z" />
    </Base>
  );
}

/**
 * a stroke that draws itself in when shown and wipes away when hidden.
 * plain css (see .icon-draw in index.css), so the home page stays light.
 * reduced motion keeps only the fade.
 */
function drawn(shown: boolean, delayMs = 0): { pathLength: number; className: string; style: CSSProperties } {
  return {
    pathLength: 1,
    className: 'icon-draw',
    style: {
      strokeDasharray: 1,
      strokeDashoffset: shown ? 0 : 1,
      opacity: shown ? 1 : 0,
      transitionDelay: shown ? `${delayMs}ms` : '0ms',
    },
  };
}

/** sound effects: waves draw in when on, a small cross when off */
export function SpeakerIcon({ on, ...props }: IconProps & { on: boolean }) {
  return (
    <Base {...props}>
      <path
        d="M4 8h2.5L10 5v10l-3.5-3H4z"
        className="icon-draw"
        style={{ opacity: on ? 1 : 0.55 }}
      />
      <path d="M13 7.5a3.5 3.5 0 0 1 0 5" {...drawn(on)} />
      <path d="M15 5.5a6.5 6.5 0 0 1 0 9" {...drawn(on, 60)} />
      <path d="M13.5 8l3 4" {...drawn(!on)} />
      <path d="M16.5 8l-3 4" {...drawn(!on, 40)} />
    </Base>
  );
}

/** music: two notes, with a line drawn through them when off */
export function MusicIcon({ on, ...props }: IconProps & { on: boolean }) {
  return (
    <Base {...props}>
      <g className="icon-draw" style={{ opacity: on ? 1 : 0.55 }}>
        <path d="M8 14.25V5.25l7.5-1.75v9" />
        <circle cx="6" cy="14.25" r="2" />
        <circle cx="13.5" cy="12.5" r="2" />
      </g>
      <path d="M3.5 3.5l13 13" {...drawn(!on)} />
    </Base>
  );
}

/** a small pushpin. filled when pinned. */
export function PinIcon({ pinned, ...props }: IconProps & { pinned: boolean }) {
  return (
    <Base {...props}>
      <path
        d="M7.25 3.25h5.5l-.75 4.5 2.75 2.75v1.25h-9.5V10.5L8 7.75z"
        fill={pinned ? 'currentColor' : 'none'}
        className="icon-draw"
      />
      <path d="M10 11.75v5" />
    </Base>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 10h10M11 6l4 4-4 4" />
    </Base>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M15 10H5M9 6l-4 4 4 4" />
    </Base>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3.5 9 10 3.5 16.5 9" />
      <path d="M5.5 8v8h9V8" />
    </Base>
  );
}

export function UndoIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M7 5 3.5 8.5 7 12" />
      <path d="M3.5 8.5H12a4.5 4.5 0 0 1 0 9h-2" />
    </Base>
  );
}

export function HelpIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M7.6 7.6a2.4 2.4 0 1 1 3.5 2.1c-.7.4-1.1.9-1.1 1.7v.3" />
      <path d="M10 14.4v.1" strokeWidth={2} />
    </Base>
  );
}

export function AgainIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M15.5 10a5.5 5.5 0 1 1-1.6-3.9" />
      <path d="M14.5 3v3.5H11" />
    </Base>
  );
}

/** two crossing arrows: mix the letters up */
export function ShuffleIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 6.5h2.2c1.5 0 2.4.6 3.2 1.9l3.2 5.2c.8 1.3 1.7 1.9 3.2 1.9H16.5" />
      <path d="M3 13.5h2.2c1.5 0 2.4-.6 3.2-1.9" />
      <path d="M11.6 8.4c.8-1.3 1.7-1.9 3.2-1.9h1.7" />
      <path d="M14.8 4.6l1.9 1.9-1.9 1.9M14.8 13.6l1.9 1.9-1.9 1.9" />
    </Base>
  );
}

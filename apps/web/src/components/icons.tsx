import type { SVGProps } from 'react';
import { motion, useReducedMotion } from 'motion/react';

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
 * animated speaker icon. `on` drives the animation:
 * — on:  sound waves draw in with a stagger, speaker body brightens
 * — off: waves fade + shrink, X strokes draw in, speaker dims
 * reduced-motion: instant opacity swap, no path drawing.
 */
export function SpeakerIcon({ on, ...props }: IconProps & { on: boolean }) {
  const reduced = useReducedMotion();
  const dur = reduced ? 0 : 0.2;
  const ease = [0.25, 0.1, 0.25, 1] as const;

  return (
    <Base {...props}>
      {/* speaker body — always present, dims when muted */}
      <motion.path
        d="M4 8h2.5L10 5v10l-3.5-3H4z"
        animate={{ opacity: on ? 1 : 0.5 }}
        transition={{ duration: dur }}
      />

      {/* inner wave — draws in when on, shrinks when off */}
      <motion.path
        d="M13 7.5a3.5 3.5 0 0 1 0 5"
        animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }}
        initial={false}
        transition={{ duration: dur, ease, delay: on ? 0 : 0 }}
      />
      {/* outer wave — draws in slightly after inner wave */}
      <motion.path
        d="M15 5.5a6.5 6.5 0 0 1 0 9"
        animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }}
        initial={false}
        transition={{ duration: reduced ? dur : 0.26, ease, delay: on ? 0.06 : 0 }}
      />

      {/* mute X stroke 1 — draws in when off */}
      <motion.path
        d="M13.5 8l3 4"
        animate={{ pathLength: on ? 0 : 1, opacity: on ? 0 : 1 }}
        initial={false}
        transition={{ duration: dur, ease }}
      />
      {/* mute X stroke 2 — draws in slightly after stroke 1 */}
      <motion.path
        d="M16.5 8l-3 4"
        animate={{ pathLength: on ? 0 : 1, opacity: on ? 0 : 1 }}
        initial={false}
        transition={{ duration: dur, ease, delay: on ? 0 : 0.04 }}
      />
    </Base>
  );
}

/** backwards-compat wrappers used by Footer */
export function SpeakerOnIcon(props: IconProps) {
  return <SpeakerIcon on={true} {...props} />;
}
export function SpeakerOffIcon(props: IconProps) {
  return <SpeakerIcon on={false} {...props} />;
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

import { isSfxOn } from './prefs';

/**
 * tiny, soft, tactile sounds (readme 3.6): a wooden tick for a piece, a
 * pencil scratch for a line, a gentle chime for a box or a win. all made
 * with the web audio api, so there are no files and no dependency. under
 * 200ms, low volume, off by default. nothing here ever blocks play.
 */

export type Cue =
  | 'tick'   // a piece placed, a mark drawn, a disc dropped
  | 'line'   // a line or stroke drawn (squares, sim, zip, word search)
  | 'chime'  // a box, a mill, a word found, a cell filled
  | 'turn'   // the turn comes to you
  | 'win'    // you won
  | 'lose'   // you lost
  | 'pop';   // a small ui press

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;
let busyUntil = 0;

type AudioWindow = typeof window & { webkitAudioContext?: typeof AudioContext };

function audio(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    bus = ctx.createGain();
    bus.gain.value = 0.5;
    bus.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

/**
 * call on the first pointer/key event. creates the AudioContext and
 * resumes it so the very first cue is heard.
 */
export function primeSound(): void {
  const c = audio();
  if (c && c.state === 'suspended') void c.resume();
}

function note(
  c: AudioContext,
  at: number,
  type: OscillatorType,
  from: number,
  to: number,
  dur: number,
  peak: number,
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, at + dur);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(bus!);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

type Voice = { type: OscillatorType; from: number; to: number; dur: number; peak: number; at?: number };

const CUES: Record<Cue, Voice[]> = {
  tick:  [{ type: 'triangle', from: 320, to: 180, dur: 0.07, peak: 0.16 }],
  line:  [{ type: 'sawtooth', from: 220, to: 160, dur: 0.1,  peak: 0.05 }],
  chime: [
    { type: 'sine', from: 660, to: 660, dur: 0.12, peak: 0.12 },
    { type: 'sine', from: 988, to: 988, dur: 0.14, peak: 0.1, at: 0.06 },
  ],
  turn: [{ type: 'sine', from: 520, to: 520, dur: 0.13, peak: 0.09 }],
  win: [
    { type: 'sine', from: 523, to: 523, dur: 0.16, peak: 0.13 },
    { type: 'sine', from: 659, to: 659, dur: 0.16, peak: 0.12, at: 0.1 },
    { type: 'sine', from: 784, to: 784, dur: 0.22, peak: 0.12, at: 0.2 },
  ],
  lose: [
    { type: 'sine', from: 392, to: 392, dur: 0.16, peak: 0.1 },
    { type: 'sine', from: 294, to: 294, dur: 0.2,  peak: 0.09, at: 0.1 },
  ],
  pop: [{ type: 'triangle', from: 440, to: 440, dur: 0.05, peak: 0.08 }],
};

/**
 * play a cue if sound is on. also primes the context on the calling
 * gesture, so the very first cue after turning sound on is heard.
 */
export function play(cue: Cue): void {
  if (!isSfxOn()) return;
  primeSound();
  const c = audio();
  if (!c || !bus || c.state !== 'running') return;
  const start = Math.max(c.currentTime, busyUntil - 0.04);
  let end = start;
  for (const v of CUES[cue]) {
    const at = start + (v.at ?? 0);
    note(c, at, v.type, v.from, v.to, v.dur, v.peak);
    end = Math.max(end, at + v.dur);
  }
  busyUntil = end;
}

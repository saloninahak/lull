import { isMusicOn } from './prefs';

/**
 * calm background music, made live with the web audio api: no files, no
 * dependency. the feel is a slow film-score afternoon:
 *
 * - a tanpura drone underneath, plucked sa-pa over and over, so it never stops
 * - a bansuri-like flute that plays a few slow notes, slides between them,
 *   then rests
 * - now and then, a quiet santoor shimmer up high
 *
 * everything sits on the pentatonic sa re ga pa dha, so no two notes ever
 * clash, and it all goes through a low-pass filter and a long reverb, so
 * nothing is sharp or beepy. it fades out when the tab is hidden.
 */

type AudioWindow = typeof window & { webkitAudioContext?: typeof AudioContext };

/** sa is D3. just-intonation ratios sound softer than the piano's equal steps. */
const SA = 146.83;
const RATIOS = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3]; // sa re ga pa dha

/** a step on the scale to a frequency. step 0 is sa (D3), 5 is the sa above. */
function pitch(step: number): number {
  const octave = Math.floor(step / 5);
  return SA * RATIOS[((step % 5) + 5) % 5]! * 2 ** octave;
}

const VOLUME = 0.3;
/** how far ahead notes are put on the audio clock, and how often we look */
const LOOKAHEAD = 2.5;
const TICK_MS = 500;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let input: AudioNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let wanted = false;
let hidden = false;

// when the next of each kind of event is due, in audio-clock seconds
let nextPluck = 0;
let pluckIndex = 0;
let nextPhrase = 0;
let nextShimmer = 0;
let fluteStep = 7; // where the flute is on the scale (pa, middle octave)

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

/** a long, dark room: noise that fades away over a few seconds */
function makeReverb(c: AudioContext): ConvolverNode {
  const conv = c.createConvolver();
  const len = Math.floor(c.sampleRate * 4.5);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
  }
  conv.buffer = buf;
  return conv;
}

/** master → soft low-pass → (dry + long reverb) → gentle compressor → speakers */
function ensureGraph(): boolean {
  const c = getCtx();
  if (!c) return false;
  if (master) return true;

  master = c.createGain();
  master.gain.value = 0;

  const tone = c.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2200;
  tone.Q.value = 0.4;

  const dry = c.createGain();
  dry.gain.value = 0.7;
  const wet = c.createGain();
  wet.gain.value = 0.5;
  const reverb = makeReverb(c);

  const glue = c.createDynamicsCompressor();
  glue.threshold.value = -20;
  glue.ratio.value = 3;
  glue.attack.value = 0.05;
  glue.release.value = 0.6;

  master.connect(tone);
  tone.connect(dry).connect(glue);
  tone.connect(reverb).connect(wet).connect(glue);
  glue.connect(c.destination);
  input = master;
  return true;
}

/** one tanpura string: a soft pluck with a long, warm ring, a little buzzy */
function pluck(freq: number, at: number) {
  const c = ctx!;
  const body = c.createBiquadFilter();
  body.type = 'lowpass';
  body.frequency.setValueAtTime(1400, at);
  body.frequency.exponentialRampToValueAtTime(500, at + 3);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.045, at + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 5);
  for (const [type, mult, level] of [
    ['sawtooth', 1, 0.5],
    ['sine', 2, 0.35],
    ['sine', 3, 0.15],
  ] as const) {
    const osc = c.createOscillator();
    const lvl = c.createGain();
    osc.type = type;
    // a hair out of tune, the way a real string shimmers
    osc.frequency.value = freq * mult + rand(-0.4, 0.4);
    lvl.gain.value = level;
    osc.connect(lvl).connect(g);
    osc.start(at);
    osc.stop(at + 5.1);
  }
  g.connect(body).connect(input!);
}

/** one flute note: a slow breath in, a little vibrato once it settles, a slow fade */
function flute(freq: number, from: number | null, at: number, dur: number) {
  const c = ctx!;
  const osc = c.createOscillator();
  osc.type = 'sine';
  // meend: start from the last note and glide into this one
  if (from !== null && from !== freq) {
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(freq, at + 0.18);
  } else {
    osc.frequency.setValueAtTime(freq, at);
  }

  const vib = c.createOscillator();
  const vibDepth = c.createGain();
  vib.frequency.value = rand(4.6, 5.4);
  vibDepth.gain.setValueAtTime(0, at);
  vibDepth.gain.linearRampToValueAtTime(freq * 0.007, at + Math.min(0.7, dur * 0.6));
  vib.connect(vibDepth).connect(osc.frequency);

  // a breathy upper partial
  const air = c.createOscillator();
  const airLevel = c.createGain();
  air.type = 'triangle';
  air.frequency.value = freq * 2;
  airLevel.gain.value = 0.08;

  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(0.055, at + 0.35);
  g.gain.setValueAtTime(0.055, at + Math.max(0.36, dur - 0.2));
  g.gain.setTargetAtTime(0, at + Math.max(0.36, dur - 0.2), 0.45);

  osc.connect(g);
  air.connect(airLevel).connect(g);
  g.connect(input!);
  const end = at + dur + 2.5;
  for (const o of [osc, vib, air]) {
    o.start(at);
    o.stop(end);
  }
}

/** a soft struck note high up, like a santoor heard from the next room */
function shimmerNote(freq: number, at: number) {
  const c = ctx!;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.022, at + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 2.2);
  for (const [mult, level] of [
    [1, 1],
    [2, 0.25],
  ] as const) {
    const osc = c.createOscillator();
    const lvl = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * mult;
    lvl.gain.value = level;
    osc.connect(lvl).connect(g);
    osc.start(at);
    osc.stop(at + 2.3);
  }
  g.connect(input!);
}

/** the tanpura's cycle: pa, sa, sa, low sa, round and round */
const TANPURA = [SA * (3 / 4), SA, SA, SA / 2];

/** a short flute phrase that wanders a little and comes home to sa or pa */
function phrase(at: number): number {
  const notes = Math.floor(rand(3, 7));
  let t = at;
  let prev: number | null = null;
  for (let i = 0; i < notes; i++) {
    const last = i === notes - 1;
    if (last) {
      // end on a resting note: sa or pa in the flute's octave
      fluteStep = pick([5, 8, 10]);
    } else {
      fluteStep = Math.min(13, Math.max(5, fluteStep + pick([-2, -1, -1, 1, 1, 2])));
    }
    const freq = pitch(fluteStep);
    const dur = last ? rand(2.2, 3.2) : pick([0.9, 1.2, 1.2, 1.6, 2]);
    flute(freq, prev, t, dur);
    prev = freq;
    t += dur;
  }
  return t;
}

function schedule() {
  const c = ctx;
  if (!c || !input || hidden || !wanted) return;
  const horizon = c.currentTime + LOOKAHEAD;

  while (nextPluck < horizon) {
    pluck(TANPURA[pluckIndex % TANPURA.length]!, nextPluck);
    pluckIndex++;
    nextPluck += 1.3;
  }
  if (nextPhrase < horizon) {
    const end = phrase(nextPhrase);
    nextPhrase = end + rand(3, 7); // a rest, so it never nags
  }
  if (nextShimmer < horizon) {
    let t = nextShimmer;
    let step = pick([13, 14, 15]);
    for (let i = 0; i < 5; i++) {
      shimmerNote(pitch(step), t);
      step -= pick([1, 1, 2]);
      t += rand(0.22, 0.32);
    }
    nextShimmer = t + rand(18, 32);
  }
}

function fadeTo(level: number, seconds: number) {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.setTargetAtTime(level, now, seconds / 3);
}

function resume() {
  const c = ctx!;
  if (c.state === 'suspended') void c.resume();
  const now = c.currentTime;
  // pick up where it left off, but never schedule into the past
  nextPluck = Math.max(nextPluck, now + 0.1);
  nextPhrase = Math.max(nextPhrase, now + 2);
  nextShimmer = Math.max(nextShimmer, now + rand(10, 20));
  fadeTo(VOLUME, 3);
  if (timer === null) timer = setInterval(schedule, TICK_MS);
  schedule();
}

function pause() {
  fadeTo(0, 1.2);
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

let listening = false;
function watchVisibility() {
  if (listening || typeof document === 'undefined') return;
  listening = true;
  document.addEventListener('visibilitychange', () => {
    hidden = document.visibilityState === 'hidden';
    if (!wanted || !ctx) return;
    if (hidden) pause();
    else resume();
  });
}

/** start (or keep) the music. needs a user gesture first, like all web audio. */
export function startMusic(): void {
  if (!isMusicOn()) return;
  if (!ensureGraph()) return;
  watchVisibility();
  wanted = true;
  hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
  if (!hidden) resume();
}

/** fade the music out. notes already playing ring out under the fade. */
export function stopMusic(): void {
  wanted = false;
  pause();
}

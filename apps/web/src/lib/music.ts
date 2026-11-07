import { isSoundOn } from './prefs';

/**
 * calm, continuous background music (readme 3.6).
 * generated entirely with the web audio api — no files, no deps.
 * a slow, gentle loop: soft piano-like tones over a quiet pad.
 * starts on the first user gesture, stops when sound is turned off.
 */

type AudioWindow = typeof window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let reverb: ConvolverNode | null = null;
let running = false;
let stopRequested = false;
let scheduleTimer: ReturnType<typeof setTimeout> | null = null;

// --- pentatonic scale in C, two octaves — always sounds peaceful ---
const NOTES = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 784.0, 880.0];

// gentle chord progressions — indices into NOTES
const CHORDS = [
  [0, 2, 4],   // C E G
  [0, 2, 7],   // C E B
  [1, 3, 5],   // D F# A
  [0, 4, 7],   // C G B
];

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

/** make a short impulse response for a soft room reverb */
function makeReverb(c: AudioContext): ConvolverNode {
  const conv = c.createConvolver();
  const len = c.sampleRate * 2.5;
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
  }
  conv.buffer = buf;
  return conv;
}

function ensureGraph(): boolean {
  const c = getCtx();
  if (!c) return false;
  if (master) return true;

  master = c.createGain();
  master.gain.value = 0;           // fades in
  reverb = makeReverb(c);
  const dry = c.createGain();
  const wet = c.createGain();
  dry.gain.value = 0.5;
  wet.gain.value = 0.5;
  master.connect(dry).connect(c.destination);
  master.connect(reverb).connect(wet).connect(c.destination);
  return true;
}

/** play one soft piano-like note */
function tone(freq: number, startAt: number, dur: number, vol: number) {
  const c = ctx!;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;

  // add a tiny sine an octave up for warmth
  const osc2 = c.createOscillator();
  const g2 = c.createGain();
  osc2.type = 'sine';
  osc2.frequency.value = freq * 2;
  g2.gain.value = 0.15;
  osc2.connect(g2).connect(master!);

  // soft attack, long decay — piano-like
  g.gain.setValueAtTime(0.0001, startAt);
  g.gain.exponentialRampToValueAtTime(vol, startAt + 0.04);
  g.gain.exponentialRampToValueAtTime(vol * 0.6, startAt + 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);

  osc.connect(g).connect(master!);
  osc.start(startAt);
  osc.stop(startAt + dur + 0.05);
  osc2.start(startAt);
  osc2.stop(startAt + dur + 0.05);
}

/** play a soft pad chord (slow swell) */
function pad(freqs: number[], startAt: number, dur: number) {
  const c = ctx!;
  for (const freq of freqs) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * 0.5; // one octave down for the pad
    g.gain.setValueAtTime(0.0001, startAt);
    g.gain.exponentialRampToValueAtTime(0.018, startAt + 1.5);
    g.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
    osc.connect(g).connect(reverb ?? master!);
    osc.start(startAt);
    osc.stop(startAt + dur + 0.1);
  }
}

let chordIndex = 0;
let noteIndex = 0;

/** schedule the next few seconds of music */
function schedule() {
  if (stopRequested || !ctx || !master || !isSoundOn()) return;
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }

  const now = ctx.currentTime;
  const beat = 1.8;   // slow, peaceful tempo (~33 bpm)
  const ahead = 4.0;  // schedule this far ahead

  // play melody notes
  for (let i = 0; i < Math.ceil(ahead / beat); i++) {
    const t = now + i * beat;
    const noteFreq = NOTES[noteIndex % NOTES.length]!;
    // occasionally skip a note for breathing room
    if (Math.random() > 0.25) {
      tone(noteFreq, t, beat * 1.4, 0.07 + Math.random() * 0.04);
    }
    noteIndex++;
  }

  // play a pad chord every 4 beats
  const chordFreqs = CHORDS[chordIndex % CHORDS.length]!.map((i) => NOTES[i]!);
  pad(chordFreqs, now, beat * 4);
  chordIndex++;

  scheduleTimer = setTimeout(schedule, (ahead - 0.5) * 1000);
}

export function startMusic(): void {
  if (running) return;
  if (!isSoundOn()) return;
  if (!ensureGraph()) return;

  const c = ctx!;
  if (c.state === 'suspended') void c.resume();

  running = true;
  stopRequested = false;

  // fade master volume in gently
  master!.gain.cancelScheduledValues(c.currentTime);
  master!.gain.setValueAtTime(master!.gain.value, c.currentTime);
  master!.gain.linearRampToValueAtTime(0.7, c.currentTime + 2.5);

  schedule();
}

export function stopMusic(): void {
  if (!running) return;
  running = false;
  stopRequested = true;
  if (scheduleTimer !== null) {
    clearTimeout(scheduleTimer);
    scheduleTimer = null;
  }
  // fade out gently
  if (ctx && master) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
  }
}

export function toggleMusic(on: boolean): void {
  if (on) startMusic();
  else stopMusic();
}

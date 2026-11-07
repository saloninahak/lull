/**
 * a tiny seeded random generator (mulberry32). the seed lives in game state,
 * so the server, pass-and-play, and tests all get the same results from the
 * same seed. each call returns the value and the next seed.
 */

export type Seed = number;

/** a float in [0, 1) and the next seed */
export function nextFloat(seed: Seed): [number, Seed] {
  const nextSeed = (seed + 0x6d2b79f5) | 0;
  let t = nextSeed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, nextSeed];
}

/** an integer in [0, n) and the next seed */
export function nextInt(seed: Seed, n: number): [number, Seed] {
  const [f, s] = nextFloat(seed);
  return [Math.floor(f * n), s];
}

/** a shuffled copy (fisher-yates) and the next seed */
export function shuffle<T>(items: readonly T[], seed: Seed): [T[], Seed] {
  const out = items.slice();
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    const [j, ns] = nextInt(s, i + 1);
    s = ns;
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return [out, s];
}

/** a stable 32-bit seed from a string (fnv-1a) */
export function seedFrom(text: string): Seed {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}

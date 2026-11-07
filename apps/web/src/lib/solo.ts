import type { Player } from '@lull/game-logic';

/** the one player in a solo game */
export const YOU: Player = { id: 'you', name: 'you' };

/** a fresh seed for a new puzzle or word. getRandomValues works on plain http too. */
export function randomSeed(): number {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return n[0]! | 0;
}

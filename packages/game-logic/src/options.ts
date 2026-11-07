import type { GameId } from './types.ts';

/**
 * the few choices a host can make in the lobby, per game. anything that
 * arrives is checked against these lists, so a game only ever sees values
 * it knows.
 */

export type OptionValue = string | number;
export type OptionValues = Record<string, OptionValue>;
export type OptionSpec = { key: string; values: readonly OptionValue[]; initial: OptionValue };

export const GAME_OPTIONS: Record<GameId, readonly OptionSpec[]> = {
  tictactoe: [{ key: 'variant', values: ['classic', 'five'], initial: 'classic' }],
  dots: [{ key: 'size', values: [4, 5, 6], initial: 5 }],
  morris: [],
  bingo: [],
  connect4: [],
  skribbl: [
    { key: 'rounds', values: [1, 2, 3], initial: 2 },
    { key: 'seconds', values: [60, 80, 100], initial: 80 },
  ],
  pictionary: [
    { key: 'rounds', values: [1, 2, 3], initial: 1 },
    { key: 'seconds', values: [45, 60, 90], initial: 60 },
  ],
  wordchain: [{ key: 'seconds', values: [10, 15, 20], initial: 15 }],
  hangman: [],
  rps: [{ key: 'target', values: [3, 5], initial: 3 }],
  sudoku: [{ key: 'level', values: ['easy', 'medium', 'hard'], initial: 'easy' }],
  zip: [{ key: 'size', values: [5, 6, 7, 8], initial: 6 }],
  npat: [
    { key: 'rounds', values: [3, 5, 8], initial: 5 },
    { key: 'seconds', values: [45, 60, 90], initial: 60 },
  ],
  sim: [],
  wordsearch: [{ key: 'size', values: [8, 10, 12], initial: 10 }],
  futoshiki: [{ key: 'size', values: [4, 5, 6], initial: 5 }],
  consequences: [
    { key: 'lines', values: [5, 7], initial: 7 },
    { key: 'seconds', values: [60, 90, 120], initial: 90 },
  ],
  onestory: [
    { key: 'words', values: [30, 50, 80], initial: 50 },
    { key: 'seconds', values: [10, 20, 30], initial: 20 },
  ],
  wordwheel: [{ key: 'letters', values: [5, 6, 7], initial: 6 }],
};

export function normalizeOptions(game: GameId, raw: unknown): OptionValues {
  const src =
    typeof raw === 'object' && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const out: OptionValues = {};
  for (const spec of GAME_OPTIONS[game]) {
    const v = src[spec.key];
    out[spec.key] = spec.values.includes(v as OptionValue) ? (v as OptionValue) : spec.initial;
  }
  return out;
}

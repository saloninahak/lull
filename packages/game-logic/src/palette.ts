import type { GameId } from './types.ts';

/**
 * player colors: the four accents plus two neutral tones (readme 3.4).
 * each game starts with its own accent, then the neutrals, so a two-player
 * game only ever shows one accent. other accents appear only past three
 * players. players 7 and 8 (bingo) reuse colors with a square shape, and
 * every player also shows an initial, so color is never the only signal.
 */

export type Accent = 'blue' | 'amber' | 'red' | 'green';
export type PlayerColor = Accent | 'graphite' | 'stone';
export type PlayerShape = 'circle' | 'square';
export type PlayerLook = { color: PlayerColor; shape: PlayerShape };

/** the games share four accents; each game still uses exactly one */
export const GAME_ACCENT: Record<GameId, Accent> = {
  tictactoe: 'blue',
  dots: 'amber',
  morris: 'red',
  bingo: 'green',
  connect4: 'red',
  skribbl: 'blue',
  pictionary: 'amber',
  wordchain: 'green',
  hangman: 'blue',
  rps: 'amber',
  sudoku: 'green',
  zip: 'red',
  npat: 'blue',
  sim: 'amber',
  wordsearch: 'green',
  futoshiki: 'red',
  consequences: 'blue',
  onestory: 'amber',
  wordwheel: 'green',
};

const ACCENT_ORDER: Accent[] = ['blue', 'amber', 'red', 'green'];

/** the color order for a game: its accent, graphite, stone, then the other accents */
export function paletteFor(game: GameId): PlayerColor[] {
  const own = GAME_ACCENT[game];
  return [own, 'graphite', 'stone', ...ACCENT_ORDER.filter((a) => a !== own)];
}

/** the color and shape of the player in seat `index` (0-based) */
export function playerLook(game: GameId, index: number): PlayerLook {
  const palette = paletteFor(game);
  const color = palette[index % palette.length] as PlayerColor;
  const shape: PlayerShape = index < palette.length ? 'circle' : 'square';
  return { color, shape };
}

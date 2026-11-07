import { describe, expect, it } from 'vitest';
import {
  GAME_ACCENT,
  isError,
  nextFloat,
  nextInt,
  paletteFor,
  playerLook,
  seedFrom,
  SetupError,
  shuffle,
  tictactoe,
} from '../src';
import { players } from './helpers';

describe('rng', () => {
  it('is deterministic for a seed', () => {
    expect(nextFloat(42)).toEqual(nextFloat(42));
    expect(nextFloat(42)[0]).not.toEqual(nextFloat(43)[0]);
  });

  it('stays in range', () => {
    let s = 7;
    for (let i = 0; i < 2000; i++) {
      const [f, s1] = nextFloat(s);
      const [n, s2] = nextInt(s1, 10);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      expect(Number.isInteger(n) && n >= 0 && n < 10).toBe(true);
      s = s2;
    }
  });

  it('shuffles into a permutation without touching the input', () => {
    const input = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);
    const [out] = shuffle(input, 99);
    expect([...out].sort((a, b) => a - b)).toEqual([...input]);
    expect(shuffle(input, 99)[0]).toEqual(out);
  });

  it('turns text into a stable seed', () => {
    expect(seedFrom('lull')).toBe(seedFrom('lull'));
    expect(seedFrom('lull')).not.toBe(seedFrom('lul'));
  });
});

describe('palette', () => {
  it('starts every game with its own accent, then the neutrals', () => {
    for (const [game, accent] of Object.entries(GAME_ACCENT)) {
      const p = paletteFor(game as keyof typeof GAME_ACCENT);
      expect(p.slice(0, 3)).toEqual([accent, 'graphite', 'stone']);
      expect(new Set(p).size).toBe(6);
    }
  });

  it('keeps two-player games to one accent', () => {
    expect([playerLook('tictactoe', 0).color, playerLook('tictactoe', 1).color]).toEqual([
      'blue',
      'graphite',
    ]);
    expect(playerLook('morris', 1).color).toBe('graphite');
  });

  it('gives seats 7 and 8 a square so they stay distinct', () => {
    expect(playerLook('bingo', 6)).toEqual({ color: 'green', shape: 'square' });
    expect(playerLook('bingo', 7)).toEqual({ color: 'graphite', shape: 'square' });
    expect(playerLook('bingo', 5).shape).toBe('circle');
  });
});

describe('setup', () => {
  it('rejects the wrong number of players and duplicate ids', () => {
    expect(() => tictactoe.init(players(1))).toThrow(SetupError);
    expect(() => tictactoe.init(players(3))).toThrow(SetupError);
    const [a] = players(1);
    expect(() => tictactoe.init([a!, { ...a! }])).toThrow(SetupError);
  });

  it('recognises errors', () => {
    expect(isError({ error: 'nope' })).toBe(true);
    expect(isError(tictactoe.init(players(2)))).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  cleanAnswer,
  normalizeOptions,
  npat,
  NPAT_LETTERS,
  onLetter,
  POINTS_SHARED,
  POINTS_UNIQUE,
  roundPoints,
  STOP_GRACE_MS,
  struck,
  type NpatState,
  type NpatView,
} from '../src';
import { freeze, ok, players } from './helpers';

const [a, b, c] = players(3).map((p) => p.id) as [string, string, string];

const start = (n = 3, rounds = 3) =>
  npat.init(players(n), { seed: 5, now: 0, rounds, seconds: 60 });

/** a word on this round's letter, so tests don't depend on which letter came up */
const on = (s: NpatState, rest: string) => `${s.letter}${rest}`;

function fill(s: NpatState, by: string, words: string[]): NpatState {
  return words.reduce(
    (st, text, field) => ok(npat.apply(st, { type: 'answer', field, text }, by, { now: 1 })),
    s,
  );
}

describe('name place animal thing: writing', () => {
  it('draws a fair letter and starts the clock', () => {
    const s = start();
    expect(NPAT_LETTERS).toContain(s.letter);
    expect(s.phase).toBe('write');
    expect(s.deadline).toBe(60_000);
    expect(s.round).toBe(1);
    expect(npat.status(s).over).toBe(false);
  });

  it('cleans answers and keeps them private while writing', () => {
    let s = freeze(start());
    s = ok(npat.apply(s, { type: 'answer', field: 0, text: '  An9a   Maria!! ' }, a));
    expect(s.answers[a]![0]).toBe('Ana Maria ');
    expect(cleanAnswer(`${'x'.repeat(50)}`)).toHaveLength(30);
    expect(npat.apply(s, { type: 'answer', field: 4, text: 'x' }, a)).toEqual({
      error: 'bad-move',
    });
    const theirs = npat.view!(s, b) as NpatView;
    expect(theirs.answers[a]).toBeNull();
    expect(theirs.answers[b]).toEqual(['', '', '', '']);
    expect((npat.view!(s, a) as NpatView).answers[a]![0]).toBe('Ana Maria ');
  });

  it('counts an answer only on the letter, two letters or more', () => {
    expect(onLetter('Bob', 'b')).toBe(true);
    expect(onLetter(' bob ', 'b')).toBe(true);
    expect(onLetter('b', 'b')).toBe(false);
    expect(onLetter('rob', 'b')).toBe(false);
  });

  it('lets someone who filled all four say stop, which leaves a few seconds', () => {
    let s = start();
    expect(npat.apply(s, { type: 'stop' }, a, { now: 1000 })).toEqual({ error: 'not-finished' });
    s = fill(s, a, [on(s, 'ob'), on(s, 'ome'), on(s, 'at'), on(s, 'all')]);
    expect((npat.view!(s, b) as NpatView).filled[a]).toBe(4);
    s = ok(npat.apply(s, { type: 'stop' }, a, { now: 10_000 }));
    expect(s.stoppedBy).toBe(a);
    expect(s.deadline).toBe(10_000 + STOP_GRACE_MS);
    expect(npat.apply(s, { type: 'stop' }, a, { now: 10_001 })).toEqual({
      error: 'already-stopped',
    });
    // the others can still write until then
    s = ok(npat.apply(s, { type: 'answer', field: 0, text: on(s, 'en') }, b, { now: 11_000 }));
    expect(npat.tick!(s, 12_999)).toBe(s);
    s = npat.tick!(s, 13_000);
    expect(s.phase).toBe('check');
    expect(npat.apply(s, { type: 'answer', field: 0, text: 'late' }, b)).toEqual({
      error: 'wait',
    });
  });
});

describe('name place animal thing: reading out and scoring', () => {
  const written = () => {
    let s = start();
    s = fill(s, a, [on(s, 'ob'), on(s, 'ome'), on(s, 'at'), on(s, 'all')]);
    s = fill(s, b, [on(s, 'ob'), on(s, 'erlin'), 'zebra', '']);
    s = fill(s, c, [on(s, 'en'), on(s, '-OME'), on(s, 'at'), on(s, 'x')]);
    return npat.tick!(s, 60_000);
  };

  it('shows everyone every answer, and what each would score', () => {
    const s = written();
    const view = npat.view!(s, b) as NpatView;
    expect(view.answers[a]).toEqual(s.answers[a]);
    const p = roundPoints(s);
    // a's name is shared with b, place is shared with c ("-ome" counts the same), animal shared with c
    expect(p[a]).toEqual([POINTS_SHARED, POINTS_SHARED, POINTS_SHARED, POINTS_UNIQUE]);
    // b's animal is on the wrong letter, thing is blank
    expect(p[b]).toEqual([POINTS_SHARED, POINTS_UNIQUE, 0, 0]);
    expect(p[c]).toEqual([POINTS_UNIQUE, POINTS_SHARED, POINTS_SHARED, POINTS_UNIQUE]);
    expect(view.points).toEqual(p);
  });

  it('strikes an answer when most of the others flag it, never your own', () => {
    let s = written();
    expect(npat.apply(s, { type: 'flag', player: a, field: 3 }, a)).toEqual({
      error: 'own-answer',
    });
    s = ok(npat.apply(s, { type: 'flag', player: c, field: 3 }, a));
    // one of two others isn't more than half
    expect(struck(s, c, 3)).toBe(false);
    s = ok(npat.apply(s, { type: 'flag', player: c, field: 3 }, b));
    expect(struck(s, c, 3)).toBe(true);
    expect(roundPoints(s)[c]![3]).toBe(0);
    // flagging again takes it back
    s = ok(npat.apply(s, { type: 'flag', player: c, field: 3 }, b));
    expect(struck(s, c, 3)).toBe(false);
    // a struck answer stops sharing, so the other one is unique again
    s = ok(npat.apply(s, { type: 'flag', player: c, field: 2 }, a));
    s = ok(npat.apply(s, { type: 'flag', player: c, field: 2 }, b));
    expect(roundPoints(s)[a]![2]).toBe(POINTS_UNIQUE);
  });

  it('moves to the next letter once everyone is ready, adding the points', () => {
    let s = written();
    const first = s.letter;
    const p = roundPoints(s);
    for (const id of [a, b]) s = ok(npat.apply(s, { type: 'ready' }, id, { now: 61_000 }));
    expect(s.phase).toBe('check');
    expect(ok(npat.apply(s, { type: 'ready' }, a, { now: 61_000 }))).toBe(s);
    s = ok(npat.apply(s, { type: 'ready' }, c, { now: 62_000 }));
    expect(s.phase).toBe('write');
    expect(s.round).toBe(2);
    expect(s.letter).not.toBe(first);
    expect(s.deadline).toBe(62_000 + 60_000);
    expect(s.answers[a]).toEqual(['', '', '', '']);
    expect(s.scores).toEqual([a, b, c].map((id) => p[id]!.reduce((x, y) => x + y, 0)));
    expect(s.last?.letter).toBe(first);
  });

  it('moves on by itself when reading out runs long, and ends after the last round', () => {
    let s = start(2, 3);
    const seen = new Set<string>();
    for (let r = 1; r <= 3; r++) {
      seen.add(s.letter);
      s = npat.tick!(s, s.deadline);
      expect(s.phase).toBe('check');
      expect(s.round).toBe(r);
      // nobody says ready: the reading-out clock moves it on
      s = npat.tick!(s, s.deadline);
    }
    expect(seen.size).toBe(3);
    expect(s.phase).toBe('done');
    expect(npat.status(s)).toEqual({ draw: true, over: true });
    expect(npat.apply(s, { type: 'ready' }, a)).toEqual({ error: 'game-over' });
  });

  it('refuses moves at the wrong time and from outsiders', () => {
    const s = start();
    expect(npat.apply(s, { type: 'flag', player: a, field: 0 }, b)).toEqual({ error: 'wait' });
    expect(npat.apply(s, { type: 'ready' }, a)).toEqual({ error: 'wait' });
    expect(npat.apply(s, { type: 'answer', field: 0, text: 'x' }, 'nobody')).toEqual({
      error: 'not-a-player',
    });
    expect(npat.apply(s, { type: 'dance' } as never, a)).toEqual({ error: 'bad-move' });
  });

  it('takes lobby options from the lists only', () => {
    expect(normalizeOptions('npat', { rounds: 8, seconds: 45 })).toEqual({
      rounds: 8,
      seconds: 45,
    });
    expect(normalizeOptions('npat', { rounds: 99 })).toEqual({ rounds: 5, seconds: 60 });
    expect(npat.init(players(2), { rounds: 4 as never }).rounds).toBe(5);
  });
});

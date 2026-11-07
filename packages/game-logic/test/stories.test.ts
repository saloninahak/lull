import { describe, expect, it } from 'vitest';
import {
  BLANK_LINE,
  cleanLine,
  cleanStoryWord,
  consequences,
  END_AFTER,
  onestory,
  sheetAt,
  type ConsequencesState,
  type ConsequencesView,
  type OneStoryState,
} from '../src';
import { freeze, ok, players } from './helpers';

const [a, b, c] = players(3).map((p) => p.id) as [string, string, string];

describe('consequences', () => {
  const start = (n = 3, lines = 5) =>
    consequences.init(players(n), { lines, seconds: 60, now: 0 }) as ConsequencesState;
  const write = (s: ConsequencesState, by: string, text: string, now = 1) =>
    ok(consequences.apply(s, { type: 'write', text }, by, { now }));
  const view = (s: ConsequencesState, id: string) => consequences.view!(s, id) as ConsequencesView;

  it('passes every sheet one seat on each step', () => {
    expect([0, 1, 2].map((i) => sheetAt(3, i, 0))).toEqual([0, 1, 2]);
    expect([0, 1, 2].map((i) => sheetAt(3, i, 1))).toEqual([2, 0, 1]);
    expect(start(3, 7).prompts).toHaveLength(7);
    expect(start(3, 5).prompts).toEqual(['who', 'met', 'where', 'then', 'everyone']);
  });

  it('shows you only the line above the fold, never the rest', () => {
    let s = freeze(start());
    expect(view(s, a)).toMatchObject({ prompt: 'who', above: null, mine: null, stories: null });
    s = write(s, a, '  a  giraffe ');
    expect(view(s, a).mine).toBe('a giraffe');
    expect(consequences.apply(s, { type: 'write', text: 'again' }, a)).toEqual({
      error: 'already-written',
    });
    // until everyone has written, nothing moves
    expect(view(s, b).above).toBeNull();
    s = write(s, b, 'the queen');
    s = write(s, c, 'my aunt');
    // step two: each holds the sheet from the seat before, and sees just its one line
    expect(s.step).toBe(1);
    expect(view(s, b)).toMatchObject({ prompt: 'met', above: 'a giraffe', mine: null });
    expect(view(s, a).above).toBe('my aunt');
    s = write(s, b, 'a dentist');
    // step three: b's line moved on to c, and c can't see the giraffe any more
    s = write(s, a, 'a robot');
    s = write(s, c, 'a ghost');
    expect(view(s, c).above).toBe('a dentist');
    expect(JSON.stringify(view(s, c))).not.toContain('giraffe');
  });

  it('fills in anyone who runs out of time, and unfolds every sheet at the end', () => {
    let s = start(2, 5);
    for (let step = 0; step < 5; step++) {
      s = write(s, a, `a${step}`, step * 1000);
      // b never writes: the clock moves the sheets on
      expect(consequences.tick!(s, s.deadline - 1)).toBe(s);
      s = consequences.tick!(s, s.deadline);
    }
    expect(s.phase).toBe('done');
    expect(consequences.status(s)).toEqual({ over: true });
    const stories = view(s, b).stories!;
    expect(stories).toHaveLength(2);
    for (const story of stories) {
      expect(story).toHaveLength(5);
      // lines alternate between the two writers
      expect(story.map((l) => l.by)).toEqual(
        story[0]!.by === a ? [a, b, a, b, a] : [b, a, b, a, b],
      );
    }
    expect(stories.flat().filter((l) => l.text === BLANK_LINE)).toHaveLength(5);
    expect(consequences.apply(s, { type: 'write', text: 'late' }, a)).toEqual({
      error: 'game-over',
    });
  });

  it('keeps lines short and plain, and refuses an empty one', () => {
    expect(cleanLine('  hello \n  there ')).toBe('hello there');
    expect(cleanLine('x'.repeat(100))).toHaveLength(80);
    expect(consequences.apply(start(), { type: 'write', text: '   ' }, a)).toEqual({
      error: 'empty',
    });
    expect(consequences.apply(start(), { type: 'write', text: 'hi' }, 'nobody')).toEqual({
      error: 'not-a-player',
    });
  });
});

describe('one-word story', () => {
  const start = () =>
    onestory.init(players(3), { words: 30, seconds: 20, now: 0 }) as OneStoryState;
  const say = (s: OneStoryState, word: string) =>
    ok(onestory.apply(s, { type: 'word', word }, s.players[s.turn]!, { now: 1 }));

  it('takes one word a turn, in turn', () => {
    let s = freeze(start());
    expect(onestory.status(s)).toEqual({ turn: a, over: false });
    expect(onestory.apply(s, { type: 'word', word: 'hi' }, b)).toEqual({ error: 'not-your-turn' });
    s = say(s, 'Once');
    s = say(s, 'upon');
    expect(s.words.map((w) => w.by)).toEqual([a, b]);
    expect(onestory.status(s).turn).toBe(c);
    expect(onestory.apply(s, { type: 'word', word: 'a time' }, c)).toEqual({ error: 'bad-word' });
  });

  it('knows a word: inner apostrophes and hyphens, one mark at the end', () => {
    for (const w of ["don't", 'well-known', 'end.', 'what?!'.slice(0, 5), 'I', '42']) {
      expect(cleanStoryWord(w)).toBe(w);
    }
    for (const w of ['', 'two words', '...', '-dash', "'quote", 'x'.repeat(25), 'hi!!']) {
      expect(cleanStoryWord(w)).toBe('');
    }
  });

  it('ends at the limit, or with "the end" once it has had twelve words', () => {
    let s = start();
    expect(onestory.apply(s, { type: 'end' }, a)).toEqual({ error: 'too-soon' });
    for (let i = 0; i < END_AFTER; i++) s = say(s, `w${i}`);
    const whose = s.players[s.turn]!;
    const ended = ok(onestory.apply(s, { type: 'end' }, whose));
    expect(ended).toMatchObject({ ended: 'the-end', endedBy: whose });
    expect(onestory.status(ended)).toEqual({ over: true });
    for (let i = END_AFTER; i < 30; i++) s = say(s, `w${i}`);
    expect(s.words).toHaveLength(30);
    expect(s.ended).toBe('limit');
    expect(onestory.apply(s, { type: 'word', word: 'more' }, a)).toEqual({ error: 'game-over' });
  });

  it('passes a turn on quietly when time runs out', () => {
    const s = start();
    expect(onestory.tick!(s, 19_999)).toBe(s);
    const next = onestory.tick!(s, 20_000);
    expect(next.turn).toBe(1);
    expect(next.words).toEqual([]);
    expect(next.deadline).toBe(40_000);
  });
});

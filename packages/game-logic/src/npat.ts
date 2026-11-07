import { nextInt, seedFrom, type Seed } from './rng.ts';
import {
  asRecord,
  checkPlayers,
  scoreStatus,
  type Game,
  type MoveResult,
  type Player,
  type Status,
} from './types.ts';

/**
 * name, place, animal, thing (readme 7.13). each round a letter is drawn
 * and everyone writes one of each starting with it, against the clock. the
 * first to fill all four can say stop, which leaves everyone a few seconds.
 *
 * then the answers are read out together. anyone can flag someone else's
 * answer; it's struck when most of the others agree. an answer scores 10
 * when nobody else wrote it, 5 when someone did, and 0 if it's blank, on
 * the wrong letter, or struck. there's no dictionary: the room decides.
 */

export const CATEGORIES = ['name', 'place', 'animal', 'thing'] as const;
export type Category = (typeof CATEGORIES)[number];

/** letters that are fair for all four. no q, x, y or z. */
export const NPAT_LETTERS = 'abcdefghijklmnoprstuvw';
export const ANSWER_MAX = 30;
/** after someone says stop, everyone has this long to finish the word they're on */
export const STOP_GRACE_MS = 3000;
/** the longest the reading-out lasts, if not everyone says they're ready */
export const CHECK_MS = 45_000;
export const POINTS_UNIQUE = 10;
export const POINTS_SHARED = 5;

export type NpatOptions = { rounds?: number; seconds?: number };

export type NpatState = {
  players: string[];
  scores: number[];
  rounds: number;
  seconds: number;
  /** from 1 */
  round: number;
  /** every letter drawn so far; the last is this round's */
  letters: string[];
  letter: string;
  phase: 'write' | 'check' | 'done';
  deadline: number;
  stoppedBy: string | null;
  /** four answers per player, in CATEGORIES order */
  answers: Record<string, string[]>;
  /** `${player}:${field}` to the ids who flagged it */
  flags: Record<string, string[]>;
  ready: string[];
  last: { letter: string; points: Record<string, number[]> } | null;
  rng: Seed;
};

export type NpatMove =
  | { type: 'answer'; field: number; text: string }
  | { type: 'stop' }
  | { type: 'flag'; player: string; field: number }
  | { type: 'ready' };

export type NpatError =
  | 'game-over'
  | 'not-a-player'
  | 'wait'
  | 'bad-move'
  | 'not-finished'
  | 'already-stopped'
  | 'own-answer';

export type NpatView = Omit<NpatState, 'answers' | 'rng'> & {
  /** your own answers always; everyone else's once the round is read out */
  answers: Record<string, string[] | null>;
  /** how many of their four each player has filled */
  filled: Record<string, number>;
  /** what each answer would score right now, while reading out */
  points: Record<string, number[]> | null;
};

/** what's kept of an answer: letters, spaces, hyphens and apostrophes, single spaced */
export function cleanAnswer(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[^\p{L}\s'-]/gu, '')
    .replace(/\s+/g, ' ')
    .trimStart()
    .slice(0, ANSWER_MAX);
}

/** does it count at all: two letters or more, starting with the round's letter */
export function onLetter(text: string, letter: string): boolean {
  const t = text.trim().toLowerCase();
  return t.length >= 2 && t.startsWith(letter);
}

/** two answers are the same when their letters are: "new york" and "New-York" */
const sameAs = (text: string) => text.toLowerCase().replace(/[^\p{L}]/gu, '');
const key = (player: string, field: number) => `${player}:${field}`;

/** struck when more than half of the others flagged it */
export function struck(state: Pick<NpatState, 'flags' | 'players'>, player: string, field: number) {
  const votes = state.flags[key(player, field)]?.length ?? 0;
  return votes * 2 > state.players.length - 1;
}

/** the points every answer earns this round, as things stand */
export function roundPoints(state: NpatState): Record<string, number[]> {
  const counts = (s: Pick<NpatState, 'flags' | 'players'>, p: string, f: number) =>
    onLetter(state.answers[p]![f]!, state.letter) && !struck(s, p, f);
  const out: Record<string, number[]> = {};
  for (const p of state.players) out[p] = [0, 0, 0, 0];
  CATEGORIES.forEach((_, f) => {
    const valid = state.players.filter((p) => counts(state, p, f));
    for (const p of valid) {
      const mine = sameAs(state.answers[p]![f]!);
      const shared = valid.some((o) => o !== p && sameAs(state.answers[o]![f]!) === mine);
      out[p]![f] = shared ? POINTS_SHARED : POINTS_UNIQUE;
    }
  });
  return out;
}

const blank = (players: readonly string[]) =>
  Object.fromEntries(players.map((id) => [id, ['', '', '', '']])) as Record<string, string[]>;

function startRound(s: NpatState, round: number, now: number): NpatState {
  const left = [...NPAT_LETTERS].filter((l) => !s.letters.includes(l));
  const pool = left.length ? left : [...NPAT_LETTERS];
  const [i, rng] = nextInt(s.rng, pool.length);
  const letter = pool[i]!;
  return {
    ...s,
    round,
    letter,
    letters: [...s.letters, letter],
    phase: 'write',
    deadline: now + s.seconds * 1000,
    stoppedBy: null,
    answers: blank(s.players),
    flags: {},
    ready: [],
    rng,
  };
}

function finishRound(s: NpatState, now: number): NpatState {
  const points = roundPoints(s);
  const scores = s.players.map(
    (p, i) => (s.scores[i] ?? 0) + points[p]!.reduce((a, b) => a + b, 0),
  );
  const next: NpatState = { ...s, scores, last: { letter: s.letter, points } };
  if (s.round >= s.rounds) return { ...next, phase: 'done' };
  return startRound(next, s.round + 1, now);
}

const fieldOf = (v: unknown) =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) < CATEGORIES.length
    ? (v as number)
    : null;

export const npat: Game<NpatState, NpatMove, NpatOptions, NpatError> = {
  id: 'npat',
  minPlayers: 2,
  maxPlayers: 8,

  init(players: Player[], options): NpatState {
    checkPlayers(players, 2, 8);
    const ids = players.map((p) => p.id);
    const base: NpatState = {
      players: ids,
      scores: ids.map(() => 0),
      rounds: [3, 5, 8].includes(options?.rounds ?? 0) ? options!.rounds! : 5,
      seconds: [45, 60, 90].includes(options?.seconds ?? 0) ? options!.seconds! : 60,
      round: 0,
      letters: [],
      letter: '',
      phase: 'write',
      deadline: 0,
      stoppedBy: null,
      answers: blank(ids),
      flags: {},
      ready: [],
      last: null,
      rng: options?.seed ?? seedFrom('npat'),
    };
    return startRound(base, 1, options?.now ?? 0);
  },

  view(state, viewer): NpatView {
    const open = state.phase !== 'write';
    const answers: Record<string, string[] | null> = {};
    const filled: Record<string, number> = {};
    for (const p of state.players) {
      answers[p] = open || p === viewer ? state.answers[p]! : null;
      filled[p] = state.answers[p]!.filter((a) => onLetter(a, state.letter)).length;
    }
    const { rng: _rng, ...rest } = state;
    void _rng;
    return {
      ...rest,
      answers,
      filled,
      points: state.phase === 'check' ? roundPoints(state) : null,
    };
  },

  apply(state, move, by, ctx): MoveResult<NpatState, NpatError> {
    const now = ctx?.now ?? 0;
    if (state.phase === 'done') return { error: 'game-over' };
    if (!state.players.includes(by)) return { error: 'not-a-player' };
    const m = asRecord(move);

    switch (m?.type) {
      case 'answer': {
        if (state.phase !== 'write') return { error: 'wait' };
        const field = fieldOf(m.field);
        if (field === null) return { error: 'bad-move' };
        const mine = state.answers[by]!.slice();
        mine[field] = cleanAnswer(m.text);
        return { ...state, answers: { ...state.answers, [by]: mine } };
      }

      case 'stop': {
        if (state.phase !== 'write') return { error: 'wait' };
        if (state.stoppedBy) return { error: 'already-stopped' };
        if (!state.answers[by]!.every((a) => onLetter(a, state.letter))) {
          return { error: 'not-finished' };
        }
        return { ...state, stoppedBy: by, deadline: Math.min(state.deadline, now + STOP_GRACE_MS) };
      }

      case 'flag': {
        if (state.phase !== 'check') return { error: 'wait' };
        const field = fieldOf(m.field);
        const target = m.player;
        if (field === null || typeof target !== 'string' || !state.players.includes(target)) {
          return { error: 'bad-move' };
        }
        if (target === by) return { error: 'own-answer' };
        const k = key(target, field);
        const votes = state.flags[k] ?? [];
        const next = votes.includes(by) ? votes.filter((v) => v !== by) : [...votes, by];
        return { ...state, flags: { ...state.flags, [k]: next } };
      }

      case 'ready': {
        if (state.phase !== 'check') return { error: 'wait' };
        if (state.ready.includes(by)) return state;
        const ready = [...state.ready, by];
        const s = { ...state, ready };
        return ready.length >= state.players.length ? finishRound(s, now) : s;
      }
    }
    return { error: 'bad-move' };
  },

  tick(state, now) {
    if (state.phase === 'done' || now < state.deadline) return state;
    if (state.phase === 'write') {
      return { ...state, phase: 'check', deadline: now + CHECK_MS, flags: {}, ready: [] };
    }
    return finishRound(state, now);
  },

  status(state): Status {
    if (state.phase === 'done') return scoreStatus(state.players, state.scores);
    return { over: false };
  },
};

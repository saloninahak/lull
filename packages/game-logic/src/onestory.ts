import {
  asRecord,
  checkPlayers,
  type Game,
  type MoveResult,
  type Player,
  type Status,
} from './types.ts';

/**
 * one-word story (readme 7.18). take turns adding one word to a story
 * everyone can see. it ends at the word limit, or when someone, on their
 * turn, says "the end" (not before twelve words). a turn that runs out of
 * time passes quietly to the next person. no score.
 */

export const STORY_WORD_MAX = 24;
/** "the end" only once the story has had a chance to get going */
export const END_AFTER = 12;

export type OneStoryOptions = { words?: number; seconds?: number };

export type OneStoryState = {
  players: string[];
  words: Array<{ by: string; word: string }>;
  limit: number;
  seconds: number;
  /** whose turn, as an index into players */
  turn: number;
  deadline: number;
  ended: 'limit' | 'the-end' | null;
  endedBy: string | null;
};

export type OneStoryMove = { type: 'word'; word: string } | { type: 'end' };
export type OneStoryError =
  'game-over' | 'not-a-player' | 'not-your-turn' | 'bad-word' | 'too-soon' | 'bad-move';

/**
 * one word as kept, or '' when it isn't one: letters and numbers, with
 * apostrophes and hyphens inside, and one mark of punctuation at the end.
 */
export function cleanStoryWord(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const w = raw.trim();
  if (w.length === 0 || w.length > STORY_WORD_MAX) return '';
  return /^[\p{L}\p{N}](?:[\p{L}\p{N}'’-]*[\p{L}\p{N}])?[.,!?;:]?$/u.test(w) ? w : '';
}

export const onestory: Game<OneStoryState, OneStoryMove, OneStoryOptions, OneStoryError> = {
  id: 'onestory',
  minPlayers: 2,
  maxPlayers: 8,

  init(players: Player[], options): OneStoryState {
    checkPlayers(players, 2, 8);
    const seconds = [10, 20, 30].includes(options?.seconds ?? 0) ? options!.seconds! : 20;
    return {
      players: players.map((p) => p.id),
      words: [],
      limit: [30, 50, 80].includes(options?.words ?? 0) ? options!.words! : 50,
      seconds,
      turn: 0,
      deadline: (options?.now ?? 0) + seconds * 1000,
      ended: null,
      endedBy: null,
    };
  },

  apply(state, move, by, ctx): MoveResult<OneStoryState, OneStoryError> {
    if (state.ended) return { error: 'game-over' };
    const i = state.players.indexOf(by);
    if (i < 0) return { error: 'not-a-player' };
    if (i !== state.turn) return { error: 'not-your-turn' };
    const m = asRecord(move);
    const now = ctx?.now ?? 0;

    if (m?.type === 'end') {
      if (state.words.length < END_AFTER) return { error: 'too-soon' };
      return { ...state, ended: 'the-end', endedBy: by };
    }
    if (m?.type !== 'word') return { error: 'bad-move' };
    const word = cleanStoryWord(m.word);
    if (!word) return { error: 'bad-word' };
    const words = [...state.words, { by, word }];
    if (words.length >= state.limit) return { ...state, words, ended: 'limit', endedBy: null };
    return {
      ...state,
      words,
      turn: (state.turn + 1) % state.players.length,
      deadline: now + state.seconds * 1000,
    };
  },

  tick(state, now) {
    if (state.ended || now < state.deadline) return state;
    // out of time: the turn passes on, nothing is added
    return {
      ...state,
      turn: (state.turn + 1) % state.players.length,
      deadline: now + state.seconds * 1000,
    };
  },

  status(state): Status {
    if (state.ended) return { over: true };
    return { turn: state.players[state.turn], over: false };
  },
};

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
import { WORDS } from './words.ts';

/**
 * hangman (readme 7.9). each round one player sets a secret word (or lets
 * the app pick), and everyone else takes turns guessing a letter. a right
 * letter scores a point, finishing the word scores two more. six misses
 * and the setter scores three. everyone sets once.
 */

export const MISSES = 6;
export const HANGMAN_REVEAL_MS = 3000;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

export type HangmanState = {
  players: string[];
  scores: number[];
  /** index into players of this round's setter */
  setter: number;
  round: number;
  phase: 'pick' | 'guess' | 'reveal' | 'done';
  word: string;
  guessed: string[];
  misses: number;
  /** whose turn it is to guess */
  guesser: string | null;
  revealUntil: number;
  last: { word: string; solved: boolean; by: string | null } | null;
  rng: Seed;
};

export type HangmanMove =
  | { type: 'set'; word: string }
  | { type: 'random' }
  | { type: 'guess'; letter: string }
  /** shows one letter of the word. it costs a miss and scores nothing. */
  | { type: 'hint' };

export type HangmanError =
  | 'game-over'
  | 'not-a-player'
  | 'not-setter'
  | 'not-your-turn'
  | 'wait'
  | 'bad-word'
  | 'bad-letter'
  | 'already-guessed'
  | 'no-hints';

/**
 * the letter a hint shows: the one that fills the most blanks, the first
 * of those in the word on a tie. null when every letter is found.
 */
export function hintLetter(word: string, guessed: readonly string[]): string | null {
  let best: string | null = null;
  let most = 0;
  for (const ch of word) {
    if (guessed.includes(ch)) continue;
    const n = [...word].filter((x) => x === ch).length;
    if (n > most) {
      best = ch;
      most = n;
    }
  }
  return best;
}

/** the word as the guessers see it: letters found, blanks elsewhere */
export type HangmanView = Omit<HangmanState, 'word' | 'rng'> & {
  word: string | null;
  mask: Array<string | null>;
};

export const HANGMAN_WORD_MIN = 3;
export const HANGMAN_WORD_MAX = 12;

const guessers = (s: HangmanState) => s.players.filter((_, i) => i !== s.setter);
const nextGuesser = (s: HangmanState, after: string | null) => {
  const g = guessers(s);
  return after === null ? g[0]! : g[(g.indexOf(after) + 1) % g.length]!;
};
const solved = (word: string, guessed: readonly string[]) =>
  [...word].every((ch) => guessed.includes(ch));

function endRound(
  s: HangmanState,
  now: number,
  wasSolved: boolean,
  by: string | null,
): HangmanState {
  return {
    ...s,
    phase: 'reveal',
    revealUntil: now + HANGMAN_REVEAL_MS,
    guesser: null,
    last: { word: s.word, solved: wasSolved, by },
  };
}

export const hangman: Game<HangmanState, HangmanMove, object, HangmanError> = {
  id: 'hangman',
  minPlayers: 2,
  maxPlayers: 8,

  init(players: Player[], options): HangmanState {
    checkPlayers(players, 2, 8);
    const ids = players.map((p) => p.id);
    return {
      players: ids,
      scores: ids.map(() => 0),
      setter: 0,
      round: 1,
      phase: 'pick',
      word: '',
      guessed: [],
      misses: 0,
      guesser: null,
      revealUntil: 0,
      last: null,
      rng: options?.seed ?? seedFrom('hangman'),
    };
  },

  view(state, viewer): HangmanView {
    const isSetter = state.players[state.setter] === viewer;
    const open = isSetter || state.phase === 'reveal' || state.phase === 'done';
    const { rng: _rng, ...rest } = state;
    void _rng;
    return {
      ...rest,
      word: open ? state.word : null,
      mask: [...state.word].map((ch) => (state.guessed.includes(ch) || open ? ch : null)),
    };
  },

  apply(state, move, by, ctx): MoveResult<HangmanState, HangmanError> {
    const now = ctx?.now ?? 0;
    if (state.phase === 'done') return { error: 'game-over' };
    if (!state.players.includes(by)) return { error: 'not-a-player' };
    const m = asRecord(move);
    const isSetter = state.players[state.setter] === by;

    if (m?.type === 'set' || m?.type === 'random') {
      if (state.phase !== 'pick') return { error: 'wait' };
      if (!isSetter) return { error: 'not-setter' };
      let word: string;
      let rng = state.rng;
      if (m.type === 'random') {
        const [i, next] = nextInt(rng, WORDS.length);
        rng = next;
        word = WORDS[i]!;
      } else {
        word = typeof m.word === 'string' ? m.word.trim().toLowerCase() : '';
        if (
          word.length < HANGMAN_WORD_MIN ||
          word.length > HANGMAN_WORD_MAX ||
          !/^[a-z]+$/.test(word)
        ) {
          return { error: 'bad-word' };
        }
      }
      const s = { ...state, word, rng, guessed: [], misses: 0, phase: 'guess' as const };
      return { ...s, guesser: nextGuesser(s, null) };
    }

    if (m?.type === 'guess') {
      if (state.phase !== 'guess') return { error: 'wait' };
      if (state.guesser !== by) return { error: isSetter ? 'not-setter' : 'not-your-turn' };
      const letter = typeof m.letter === 'string' ? m.letter.toLowerCase() : '';
      if (letter.length !== 1 || !ALPHABET.includes(letter)) return { error: 'bad-letter' };
      if (state.guessed.includes(letter)) return { error: 'already-guessed' };
      const guessed = [...state.guessed, letter];
      const hit = state.word.includes(letter);
      const scores = state.scores.slice();
      const me = state.players.indexOf(by);
      if (hit) scores[me] = (scores[me] ?? 0) + 1;
      const misses = state.misses + (hit ? 0 : 1);
      let s: HangmanState = { ...state, guessed, misses, scores };
      if (solved(s.word, guessed)) {
        scores[me] = (scores[me] ?? 0) + 2;
        return endRound({ ...s, scores }, now, true, by);
      }
      if (misses >= MISSES) {
        scores[state.setter] = (scores[state.setter] ?? 0) + 3;
        return endRound({ ...s, scores }, now, false, null);
      }
      s = { ...s, guesser: nextGuesser(s, by) };
      return s;
    }

    if (m?.type === 'hint') {
      if (state.phase !== 'guess') return { error: 'wait' };
      if (state.guesser !== by) return { error: isSetter ? 'not-setter' : 'not-your-turn' };
      // a hint never hangs you: the last miss has to be a guess
      if (state.misses >= MISSES - 1) return { error: 'no-hints' };
      const letter = hintLetter(state.word, state.guessed);
      if (!letter) return { error: 'no-hints' };
      const guessed = [...state.guessed, letter];
      const s: HangmanState = { ...state, guessed, misses: state.misses + 1 };
      if (solved(s.word, guessed)) return endRound(s, now, true, by);
      return { ...s, guesser: nextGuesser(s, by) };
    }

    return { error: 'bad-letter' };
  },

  tick(state, now) {
    if (state.phase !== 'reveal' || now < state.revealUntil) return state;
    // everyone has set a word once
    if (state.setter + 1 >= state.players.length) return { ...state, phase: 'done' };
    return {
      ...state,
      phase: 'pick',
      setter: state.setter + 1,
      round: state.round + 1,
      word: '',
      guessed: [],
      misses: 0,
      guesser: null,
    };
  },

  status(state): Status {
    if (state.phase === 'done') return scoreStatus(state.players, state.scores);
    if (state.phase === 'pick') return { turn: state.players[state.setter], over: false };
    if (state.phase === 'guess') return { turn: state.guesser ?? undefined, over: false };
    return { over: false };
  },
};

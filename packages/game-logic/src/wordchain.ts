import { nextInt, seedFrom } from './rng.ts';
import {
  asRecord,
  checkPlayers,
  type Game,
  type MoveResult,
  type Player,
  type Status,
} from './types.ts';

/**
 * word chain (readme 7.8). take turns saying a word that starts with the
 * last letter of the one before. no word twice. run out of time and you're
 * out. the last one standing wins. there is no dictionary: the room keeps
 * itself honest, the way it does on paper.
 */

export type WordChainOptions = { seconds?: number };

export type WordChainState = {
  players: string[];
  /** still in, in turn order */
  alive: string[];
  turn: string;
  words: Array<{ by: string; word: string }>;
  /** the letter the next word must start with */
  letter: string;
  seconds: number;
  deadline: number;
  out: Array<{ id: string; word: number }>;
  winner: string | null;
};

export type WordChainMove = { type: 'word'; word: string };
export type WordChainError =
  'game-over' | 'not-a-player' | 'not-your-turn' | 'bad-word' | 'wrong-letter' | 'used';

export const CHAIN_WORD_MIN = 3;
export const CHAIN_WORD_MAX = 20;
const LETTERS = 'abcdefghijklmnoprstw';

export const cleanWord = (raw: unknown) =>
  typeof raw === 'string' ? raw.trim().toLowerCase() : '';

const nextAlive = (alive: readonly string[], after: string) =>
  alive[(alive.indexOf(after) + 1) % alive.length]!;

export const wordchain: Game<WordChainState, WordChainMove, WordChainOptions, WordChainError> = {
  id: 'wordchain',
  minPlayers: 2,
  maxPlayers: 8,

  init(players: Player[], options): WordChainState {
    checkPlayers(players, 2, 8);
    const seconds = [10, 15, 20].includes(options?.seconds ?? 0) ? options!.seconds! : 15;
    const [i] = nextInt(options?.seed ?? seedFrom('wordchain'), LETTERS.length);
    const ids = players.map((p) => p.id);
    return {
      players: ids,
      alive: ids,
      turn: ids[0]!,
      words: [],
      letter: LETTERS[i]!,
      seconds,
      deadline: (options?.now ?? 0) + seconds * 1000,
      out: [],
      winner: null,
    };
  },

  apply(state, move, by, ctx): MoveResult<WordChainState, WordChainError> {
    if (state.winner) return { error: 'game-over' };
    if (!state.players.includes(by)) return { error: 'not-a-player' };
    if (state.turn !== by) return { error: 'not-your-turn' };
    const word = cleanWord(asRecord(move)?.word);
    if (word.length < CHAIN_WORD_MIN || word.length > CHAIN_WORD_MAX || !/^[a-z]+$/.test(word)) {
      return { error: 'bad-word' };
    }
    if (word[0] !== state.letter) return { error: 'wrong-letter' };
    if (state.words.some((w) => w.word === word)) return { error: 'used' };
    return {
      ...state,
      words: [...state.words, { by, word }],
      letter: word[word.length - 1]!,
      turn: nextAlive(state.alive, by),
      deadline: (ctx?.now ?? 0) + state.seconds * 1000,
    };
  },

  tick(state, now) {
    if (state.winner || now < state.deadline) return state;
    const gone = state.turn;
    const alive = state.alive.filter((id) => id !== gone);
    const out = [...state.out, { id: gone, word: state.words.length }];
    if (alive.length <= 1) return { ...state, alive, out, winner: alive[0] ?? gone };
    return {
      ...state,
      alive,
      out,
      turn: nextAlive(state.alive, gone),
      deadline: now + state.seconds * 1000,
    };
  },

  status(state): Status {
    if (state.winner) return { winner: [state.winner], over: true };
    return { turn: state.turn, over: false };
  },
};

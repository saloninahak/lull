import { shuffle, seedFrom, type Seed } from './rng.ts';
import {
  asRecord,
  checkPlayers,
  scoreStatus,
  type Game,
  type GameId,
  type MoveResult,
  type Player,
  type Status,
} from './types.ts';
import { WORDS } from './words.ts';

/**
 * the two drawing games (readme 7.6, 7.7). each turn one player draws a
 * word they picked from three, in plain ink, against a clock.
 *
 * skribbl: everyone else types guesses. a right guess scores more the
 * earlier it comes, and the drawer scores for every person who gets it.
 *
 * pictionary: guesses are said out loud in the room. the drawer taps the
 * name of whoever got it first; both score a point. or "nobody".
 *
 * everyone draws once per round.
 */

export type DrawMode = 'typed' | 'aloud';
export type DrawOptions = { rounds?: number; seconds?: number };

export const CHOOSE_MS = 15_000;
export const DRAW_REVEAL_MS = 3500;
/** a stroke is flat [x, y, x, y, ...] in a 0..1000 square */
export const CANVAS = 1000;
export const MAX_POINTS = 8000;
const POINTS_PER_MOVE = 120;

/** a line: w 1 is the thin pen, 2 the thick one, 3 the eraser (drawn in the paper's color) */
export type StrokeWidth = 1 | 2 | 3;
export type Stroke = { w: StrokeWidth; pts: number[] };

/** letters shown to guessers as the clock runs: one at half time, one more at three quarters */
export function revealCount(word: string, fractionGone: number): number {
  const most = word.length <= 4 ? 1 : 2;
  const due = (fractionGone >= 0.5 ? 1 : 0) + (fractionGone >= 0.75 ? 1 : 0);
  return Math.min(most, due);
}

export type DrawState = {
  mode: DrawMode;
  players: string[];
  scores: number[];
  rounds: number;
  seconds: number;
  /** turn number from 0; the drawer is players[turn % players.length] */
  turn: number;
  phase: 'choose' | 'draw' | 'reveal' | 'done';
  choices: string[];
  word: string;
  deadline: number;
  strokes: Stroke[];
  /** typed mode: who has guessed right this turn, in order */
  correct: string[];
  /** typed mode: the last few wrong guesses, for everyone to see */
  misses: Array<{ by: string; text: string }>;
  /** positions in the word shown to guessers so far, and the order they come in */
  revealed: number[];
  revealOrder: number[];
  last: { word: string; correct: string[] } | null;
  rng: Seed;
};

export type DrawMove =
  | { type: 'choose'; index: number }
  | { type: 'stroke'; w: number; pts: number[]; cont?: boolean }
  | { type: 'undo' }
  | { type: 'clear' }
  | { type: 'guess'; text: string }
  | { type: 'award'; to: string | null };

export type DrawError =
  | 'game-over'
  | 'not-a-player'
  | 'not-drawer'
  | 'drawer'
  | 'wait'
  | 'bad-move'
  | 'already-guessed'
  | 'full';

export type DrawView = Omit<DrawState, 'word' | 'choices' | 'rng' | 'revealOrder'> & {
  word: string | null;
  choices: string[] | null;
  /** the word's length */
  hint: number;
  /** the word as a guesser sees it: revealed letters, null for blanks */
  shown: Array<string | null>;
};

export const drawerOf = (s: Pick<DrawState, 'players' | 'turn'>) =>
  s.players[s.turn % s.players.length]!;

function pickChoices(rng: Seed): [string[], Seed] {
  const [all, next] = shuffle(WORDS, rng);
  return [all.slice(0, 3), next];
}

function startTurn(s: DrawState, turn: number, now: number): DrawState {
  if (turn >= s.rounds * s.players.length) return { ...s, phase: 'done', turn };
  const [choices, rng] = pickChoices(s.rng);
  return {
    ...s,
    turn,
    phase: 'choose',
    choices,
    word: '',
    strokes: [],
    correct: [],
    misses: [],
    revealed: [],
    revealOrder: [],
    deadline: now + CHOOSE_MS,
    rng,
  };
}

/** the drawer has a word: the clock starts, and the reveal order is set */
function beginDrawing(s: DrawState, word: string, now: number): DrawState {
  const [revealOrder, rng] = shuffle(
    Array.from({ length: word.length }, (_, i) => i),
    s.rng,
  );
  return {
    ...s,
    phase: 'draw',
    word,
    deadline: now + s.seconds * 1000,
    revealed: [],
    revealOrder,
    rng,
  };
}

function reveal(s: DrawState, now: number): DrawState {
  return {
    ...s,
    phase: 'reveal',
    deadline: now + DRAW_REVEAL_MS,
    last: { word: s.word, correct: s.correct },
  };
}

const normalize = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ');
const pointCount = (strokes: readonly Stroke[]) => strokes.reduce((n, s) => n + s.pts.length, 0);

export function makeDrawGame(
  id: Extract<GameId, 'skribbl' | 'pictionary'>,
  mode: DrawMode,
): Game<DrawState, DrawMove, DrawOptions, DrawError> {
  const roundsOk = [1, 2, 3];
  const secondsOk = mode === 'typed' ? [60, 80, 100] : [45, 60, 90];
  return {
    id,
    minPlayers: 2,
    maxPlayers: 8,

    init(players: Player[], options): DrawState {
      checkPlayers(players, 2, 8);
      const ids = players.map((p) => p.id);
      const base: DrawState = {
        mode,
        players: ids,
        scores: ids.map(() => 0),
        rounds: roundsOk.includes(options?.rounds ?? 0)
          ? options!.rounds!
          : mode === 'typed'
            ? 2
            : 1,
        seconds: secondsOk.includes(options?.seconds ?? 0)
          ? options!.seconds!
          : mode === 'typed'
            ? 80
            : 60,
        turn: 0,
        phase: 'choose',
        choices: [],
        word: '',
        deadline: 0,
        strokes: [],
        correct: [],
        misses: [],
        revealed: [],
        revealOrder: [],
        last: null,
        rng: options?.seed ?? seedFrom(id),
      };
      return startTurn(base, 0, options?.now ?? 0);
    },

    view(state, viewer): DrawView {
      const drawing = drawerOf(state) === viewer;
      const knows =
        drawing ||
        state.correct.includes(viewer) ||
        state.phase === 'reveal' ||
        state.phase === 'done';
      const { rng: _rng, revealOrder: _order, ...rest } = state;
      void _rng;
      void _order;
      const open = knows && state.word !== '';
      return {
        ...rest,
        word: open ? state.word : null,
        choices: drawing && state.phase === 'choose' ? state.choices : null,
        hint: state.word.length,
        shown: [...state.word].map((ch, i) => (open || state.revealed.includes(i) ? ch : null)),
      };
    },

    apply(state, move, by, ctx): MoveResult<DrawState, DrawError> {
      const now = ctx?.now ?? 0;
      if (state.phase === 'done') return { error: 'game-over' };
      if (!state.players.includes(by)) return { error: 'not-a-player' };
      const m = asRecord(move);
      const drawer = drawerOf(state);
      const isDrawer = by === drawer;

      switch (m?.type) {
        case 'choose': {
          if (!isDrawer) return { error: 'not-drawer' };
          if (state.phase !== 'choose') return { error: 'wait' };
          const index = m.index;
          if (!Number.isInteger(index) || (index as number) < 0 || (index as number) > 2) {
            return { error: 'bad-move' };
          }
          return beginDrawing(state, state.choices[index as number]!, now);
        }

        case 'stroke': {
          if (!isDrawer) return { error: 'not-drawer' };
          if (state.phase !== 'draw') return { error: 'wait' };
          const pts = m.pts;
          if (
            !Array.isArray(pts) ||
            pts.length < 2 ||
            pts.length > POINTS_PER_MOVE ||
            pts.length % 2 !== 0 ||
            !pts.every((p) => Number.isInteger(p) && p >= 0 && p <= CANVAS)
          ) {
            return { error: 'bad-move' };
          }
          if (pointCount(state.strokes) + pts.length > MAX_POINTS) return { error: 'full' };
          const w: StrokeWidth = m.w === 2 ? 2 : m.w === 3 ? 3 : 1;
          const strokes = state.strokes.slice();
          const tail = strokes[strokes.length - 1];
          // a long line arrives in pieces; `cont` adds to the one being drawn
          if (m.cont === true && tail) {
            strokes[strokes.length - 1] = { ...tail, pts: [...tail.pts, ...(pts as number[])] };
          } else {
            strokes.push({ w, pts: (pts as number[]).slice() });
          }
          return { ...state, strokes };
        }

        case 'undo':
          if (!isDrawer) return { error: 'not-drawer' };
          if (state.phase !== 'draw') return { error: 'wait' };
          return { ...state, strokes: state.strokes.slice(0, -1) };

        case 'clear':
          if (!isDrawer) return { error: 'not-drawer' };
          if (state.phase !== 'draw') return { error: 'wait' };
          return { ...state, strokes: [] };

        case 'guess': {
          if (mode !== 'typed') return { error: 'bad-move' };
          if (isDrawer) return { error: 'drawer' };
          if (state.phase !== 'draw') return { error: 'wait' };
          if (state.correct.includes(by)) return { error: 'already-guessed' };
          const text = typeof m.text === 'string' ? normalize(m.text).slice(0, 40) : '';
          if (!text) return { error: 'bad-move' };
          if (text !== state.word) {
            return { ...state, misses: [...state.misses, { by, text }].slice(-6) };
          }
          const left = Math.max(0, state.deadline - now) / (state.seconds * 1000);
          const scores = state.scores.slice();
          const me = state.players.indexOf(by);
          scores[me] = (scores[me] ?? 0) + Math.max(20, Math.round(100 * left));
          const d = state.players.indexOf(drawer);
          scores[d] = (scores[d] ?? 0) + 20;
          const next = { ...state, scores, correct: [...state.correct, by] };
          return next.correct.length >= state.players.length - 1 ? reveal(next, now) : next;
        }

        case 'award': {
          if (mode !== 'aloud') return { error: 'bad-move' };
          if (!isDrawer) return { error: 'not-drawer' };
          if (state.phase !== 'draw') return { error: 'wait' };
          const to = m.to;
          if (to === null) return reveal(state, now);
          if (typeof to !== 'string' || to === by || !state.players.includes(to)) {
            return { error: 'bad-move' };
          }
          const scores = state.scores.slice();
          scores[state.players.indexOf(to)]! += 1;
          scores[state.players.indexOf(by)]! += 1;
          return reveal({ ...state, scores, correct: [to] }, now);
        }
      }
      return { error: 'bad-move' };
    },

    tick(state, now) {
      if (state.phase === 'done') return state;
      if (state.phase === 'draw' && now < state.deadline) {
        // a letter for the guessers at half time, another at three quarters
        const gone = 1 - (state.deadline - now) / (state.seconds * 1000);
        const due = revealCount(state.word, gone);
        if (due <= state.revealed.length) return state;
        return { ...state, revealed: state.revealOrder.slice(0, due) };
      }
      if (now < state.deadline) return state;
      if (state.phase === 'choose') {
        // took too long to choose: the first word it is
        return beginDrawing(state, state.choices[0]!, now);
      }
      if (state.phase === 'draw') return reveal(state, now);
      return startTurn(state, state.turn + 1, now);
    },

    status(state): Status {
      if (state.phase === 'done') return scoreStatus(state.players, state.scores);
      return { turn: drawerOf(state), over: false };
    },
  };
}

export const skribbl = makeDrawGame('skribbl', 'typed');
export const pictionary = makeDrawGame('pictionary', 'aloud');

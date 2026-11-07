import {
  asRecord,
  checkPlayers,
  type Game,
  type MoveResult,
  type Player,
  type Status,
} from './types.ts';

/**
 * consequences (readme 7.17), the folded-paper story game. everyone starts
 * a sheet. each step, everyone writes the next line on the sheet in front
 * of them, seeing only the line just above it, then passes the sheet on.
 * when every sheet is full, they're all unfolded and read out. no score.
 */

/** what each line is about, in order. the short game skips the two "said" lines. */
export const CONSEQUENCE_PROMPTS = [
  'who',
  'met',
  'where',
  'said',
  'replied',
  'then',
  'everyone',
] as const;
export type ConsequencePrompt = (typeof CONSEQUENCE_PROMPTS)[number];
const SHORT: readonly ConsequencePrompt[] = ['who', 'met', 'where', 'then', 'everyone'];

export const LINE_MAX = 80;
/** a line nobody wrote in time */
export const BLANK_LINE = '…';

export type ConsequencesOptions = { lines?: number; seconds?: number };

export type StoryLine = { by: string; text: string };

export type ConsequencesState = {
  players: string[];
  prompts: ConsequencePrompt[];
  /** sheets[j][s]: line s of the sheet player j started */
  sheets: StoryLine[][];
  /** which line everyone is writing, from 0 */
  step: number;
  seconds: number;
  deadline: number;
  /** who has written this step's line */
  done: string[];
  phase: 'write' | 'done';
};

export type ConsequencesMove = { type: 'write'; text: string };
export type ConsequencesError = 'game-over' | 'not-a-player' | 'already-written' | 'empty';

export type ConsequencesView = Omit<ConsequencesState, 'sheets'> & {
  /** while writing: the line you're on, and the one line showing above the fold */
  prompt: ConsequencePrompt | null;
  above: string | null;
  /** what you wrote this step, once you have */
  mine: string | null;
  /** every sheet in full, once they're all done. never before. */
  stories: StoryLine[][] | null;
};

/** a line as kept: printable, single spaces, at most 80 characters */
export function cleanLine(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return Array.from(raw.replace(/\s+/g, ' '))
    .filter((ch) => (ch.codePointAt(0) ?? 0) >= 0x20)
    .join('')
    .trim()
    .slice(0, LINE_MAX)
    .trim();
}

/** the sheet player i holds at a step: each step, every sheet moves one seat on */
export const sheetAt = (players: number, i: number, step: number) =>
  (((i - step) % players) + players) % players;

/** fill in anyone who ran out of time, then move every sheet on, or unfold them all */
function advance(s: ConsequencesState, now: number): ConsequencesState {
  const n = s.players.length;
  const sheets = s.sheets.map((sheet) => sheet.slice());
  s.players.forEach((p, i) => {
    const j = sheetAt(n, i, s.step);
    if (!sheets[j]![s.step]) sheets[j]![s.step] = { by: p, text: BLANK_LINE };
  });
  const step = s.step + 1;
  if (step >= s.prompts.length) return { ...s, sheets, step: s.step, done: [], phase: 'done' };
  return { ...s, sheets, step, done: [], deadline: now + s.seconds * 1000 };
}

export const consequences: Game<
  ConsequencesState,
  ConsequencesMove,
  ConsequencesOptions,
  ConsequencesError
> = {
  id: 'consequences',
  minPlayers: 2,
  maxPlayers: 8,

  init(players: Player[], options): ConsequencesState {
    checkPlayers(players, 2, 8);
    const seconds = [60, 90, 120].includes(options?.seconds ?? 0) ? options!.seconds! : 90;
    return {
      players: players.map((p) => p.id),
      prompts: options?.lines === 5 ? [...SHORT] : [...CONSEQUENCE_PROMPTS],
      sheets: players.map(() => []),
      step: 0,
      seconds,
      deadline: (options?.now ?? 0) + seconds * 1000,
      done: [],
      phase: 'write',
    };
  },

  view(state, viewer): ConsequencesView {
    const { sheets, ...rest } = state;
    const i = state.players.indexOf(viewer);
    const writing = state.phase === 'write' && i >= 0;
    const sheet = writing ? sheets[sheetAt(state.players.length, i, state.step)]! : null;
    return {
      ...rest,
      prompt: writing ? state.prompts[state.step]! : null,
      above: sheet && state.step > 0 ? (sheet[state.step - 1]?.text ?? null) : null,
      mine: sheet?.[state.step]?.text ?? null,
      stories: state.phase === 'done' ? sheets : null,
    };
  },

  apply(state, move, by, ctx): MoveResult<ConsequencesState, ConsequencesError> {
    if (state.phase === 'done') return { error: 'game-over' };
    const i = state.players.indexOf(by);
    if (i < 0) return { error: 'not-a-player' };
    if (state.done.includes(by)) return { error: 'already-written' };
    const m = asRecord(move);
    if (m?.type !== 'write') return { error: 'empty' };
    const text = cleanLine(m.text);
    if (!text) return { error: 'empty' };
    const j = sheetAt(state.players.length, i, state.step);
    const sheets = state.sheets.slice();
    const sheet = sheets[j]!.slice();
    sheet[state.step] = { by, text };
    sheets[j] = sheet;
    const next = { ...state, sheets, done: [...state.done, by] };
    return next.done.length >= state.players.length ? advance(next, ctx?.now ?? 0) : next;
  },

  tick(state, now) {
    if (state.phase !== 'write' || now < state.deadline) return state;
    return advance(state, now);
  },

  status(state): Status {
    return { over: state.phase === 'done' };
  },
};

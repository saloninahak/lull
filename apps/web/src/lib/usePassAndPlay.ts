import { useCallback, useRef, useState } from 'react';
import { isError, type Game } from '@lull/game-logic';

/**
 * one device, everyone takes turns. the rules package does all the
 * checking; this keeps the current state plus a stack of earlier ones, so
 * undo is just stepping back (readme 5.3: undo only in pass-and-play).
 */

type Timeline<S> = { past: S[]; present: S; round: number };

export function usePassAndPlay<S, M>(game: Pick<Game<S, M>, 'apply' | 'status'>, create: () => S) {
  const [timeline, setTimeline] = useState<Timeline<S>>(() => ({
    past: [],
    present: create(),
    round: 0,
  }));
  // the latest timeline, so two quick taps never act on a stale state
  const latest = useRef(timeline);

  const commit = useCallback((t: Timeline<S>) => {
    latest.current = t;
    setTimeline(t);
  }, []);

  /**
   * play a move for whoever the game is waiting on, or for `by` in games
   * without turns (the solo puzzles). returns the error code, or null.
   */
  const play = useCallback(
    (move: M, by?: string): string | null => {
      const t = latest.current;
      const mover = by ?? game.status(t.present).turn;
      if (!mover) return 'game-over';
      const result = game.apply(t.present, move, mover);
      if (isError(result)) return result.error;
      commit({ ...t, past: [...t.past, t.present], present: result });
      return null;
    },
    [game, commit],
  );

  const undo = useCallback(() => {
    const t = latest.current;
    const previous = t.past[t.past.length - 1];
    if (previous === undefined) return;
    commit({ ...t, past: t.past.slice(0, -1), present: previous });
  }, [commit]);

  /** a fresh game. `round` changes so boards can redraw from scratch. */
  const restart = useCallback(
    (fresh: S) => commit({ past: [], present: fresh, round: latest.current.round + 1 }),
    [commit],
  );

  return {
    state: timeline.present,
    status: game.status(timeline.present),
    round: timeline.round,
    canUndo: timeline.past.length > 0,
    play,
    undo,
    restart,
  };
}

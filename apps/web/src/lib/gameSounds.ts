import { useEffect, useRef } from 'react';
import type { Status } from '@lull/game-logic';
import { play } from './sound';

/**
 * the sounds every game shares, driven by its status: a soft note when the
 * turn becomes yours, and a quiet win or lose chime when it ends. each one
 * plays once, on the change. per-move sounds (a piece, a line) live in the
 * boards, where the move actually lands.
 *
 * pass `you` in a room; leave it out for a same-screen game, where a turn
 * cue would fire every move and isn't wanted.
 */
export function useGameSounds(status: Status, you?: string): void {
  const wasMyTurn = useRef(false);
  const ended = useRef(false);

  useEffect(() => {
    if (status.over) {
      if (!ended.current) {
        ended.current = true;
        if (status.draw) play('chime');
        else if (you === undefined)
          play('win'); // same screen: someone at this pc won
        else if (status.winner?.includes(you)) play('win');
        else play('lose');
      }
      return;
    }
    ended.current = false;
    // only in a room, where waiting for your turn is a real moment
    if (you !== undefined) {
      const mine = status.turn === you;
      if (mine && !wasMyTurn.current) play('turn');
      wasMyTurn.current = mine;
    }
  }, [status, you]);
}

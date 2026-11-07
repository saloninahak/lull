import { bingo } from './bingo.ts';
import { connect4 } from './connect4.ts';
import { consequences } from './consequences.ts';
import { pictionary, skribbl } from './draw.ts';
import { dots } from './dots.ts';
import { futoshiki } from './futoshiki.ts';
import { hangman } from './hangman.ts';
import { morris } from './morris.ts';
import { npat } from './npat.ts';
import { onestory } from './onestory.ts';
import { rps } from './rps.ts';
import { sim } from './sim.ts';
import { sudoku } from './sudoku.ts';
import { tictactoe } from './tictactoe.ts';
import { wordchain } from './wordchain.ts';
import { wordsearch } from './wordsearch.ts';
import { wordwheel } from './wordwheel.ts';
import { zip } from './zip.ts';

/** every game by id */
export const games = {
  tictactoe,
  dots,
  morris,
  bingo,
  connect4,
  skribbl,
  pictionary,
  wordchain,
  hangman,
  rps,
  sudoku,
  zip,
  npat,
  sim,
  wordsearch,
  futoshiki,
  consequences,
  onestory,
  wordwheel,
} as const;

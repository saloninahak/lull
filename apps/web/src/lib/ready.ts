import { lazy, type ComponentType } from 'react';
import type { GameId } from '@lull/game-logic';
import type { RoomGameProps } from '../screens/rooms/OnlineFrame';

/**
 * the room screen for each game that has one. the server knows all twelve;
 * a game joins this list once its screen is done and checked. until then
 * its home tile says "coming soon" and can't start a room.
 */
export const ROOM_SCREENS: Partial<Record<GameId, ComponentType<RoomGameProps>>> = {
  bingo: lazy(() => import('../screens/bingo/BingoRoom')),
  tictactoe: lazy(() => import('../screens/tictactoe/TicTacToeRoom')),
  dots: lazy(() => import('../screens/dots/DotsRoom')),
  morris: lazy(() => import('../screens/morris/MorrisRoom')),
  connect4: lazy(() => import('../screens/connect4/Connect4Room')),
  rps: lazy(() => import('../screens/rps/RpsRoom')),
  sudoku: lazy(() => import('../screens/sudoku/SudokuRoom')),
  zip: lazy(() => import('../screens/zip/ZipRoom')),
  wordchain: lazy(() => import('../screens/wordchain/WordChainRoom')),
  hangman: lazy(() => import('../screens/hangman/HangmanRoom')),
  skribbl: lazy(() => import('../screens/skribbl/SkribblRoom')),
  pictionary: lazy(() => import('../screens/pictionary/PictionaryRoom')),
  npat: lazy(() => import('../screens/npat/NpatRoom')),
  sim: lazy(() => import('../screens/sim/SimRoom')),
  wordsearch: lazy(() => import('../screens/wordsearch/WordSearchRoom')),
  futoshiki: lazy(() => import('../screens/futoshiki/FutoshikiRoom')),
  consequences: lazy(() => import('../screens/consequences/ConsequencesRoom')),
  onestory: lazy(() => import('../screens/onestory/OneStoryRoom')),
  wordwheel: lazy(() => import('../screens/wordwheel/WordWheelRoom')),
};

export const READY_ONLINE = Object.keys(ROOM_SCREENS) as GameId[];

export const isReady = (id: GameId) => id in ROOM_SCREENS;

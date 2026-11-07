import { Suspense, lazy, useEffect } from 'react';
import { usePath } from './lib/router';
import { primeSound } from './lib/sound';
import { startMusic } from './lib/music';
import { Home } from './screens/home/Home';

// every screen but home (and Motion with them) loads on demand, so home stays light (readme 10)
const screens = {
  '/play/tictactoe': lazy(() => import('./screens/tictactoe/TicTacToeScreen')),
  '/play/dots': lazy(() => import('./screens/dots/DotsScreen')),
  '/play/morris': lazy(() => import('./screens/morris/MorrisScreen')),
  '/play/sim': lazy(() => import('./screens/sim/SimScreen')),
  '/play/connect4': lazy(() => import('./screens/connect4/Connect4Screen')),
  // on your own
  '/play/sudoku': lazy(() => import('./screens/sudoku/SudokuScreen')),
  '/play/zip': lazy(() => import('./screens/zip/ZipScreen')),
  '/play/hangman': lazy(() => import('./screens/hangman/HangmanScreen')),
  '/play/wordsearch': lazy(() => import('./screens/wordsearch/WordSearchScreen')),
  '/play/futoshiki': lazy(() => import('./screens/futoshiki/FutoshikiScreen')),
  '/play/wordwheel': lazy(() => import('./screens/wordwheel/WordWheelScreen')),
  '/new': lazy(() => import('./screens/rooms/NewRoomScreen')),
  '/join': lazy(() => import('./screens/rooms/JoinScreen')),
} as const;

const RoomScreen = lazy(() => import('./screens/rooms/RoomScreen'));

type ScreenPath = keyof typeof screens;
const isScreen = (path: string): path is ScreenPath => path in screens;

export function App() {
  const path = usePath();

  // browsers only let sound start after a real gesture. the first pointer or
  // key press gets the audio ready, so the first cue (if sound is on) is heard.
  useEffect(() => {
    const prime = () => {
      primeSound();
      // the music starts on the first gesture too, if it's switched on
      startMusic();
    };
    window.addEventListener('pointerdown', prime, { once: true });
    window.addEventListener('keydown', prime, { once: true });
    return () => {
      window.removeEventListener('pointerdown', prime);
      window.removeEventListener('keydown', prime);
    };
  }, []);

  // a room link: /r/QBXT
  const room = /^\/r\/([^/]+)\/?$/.exec(path);
  if (room) {
    return (
      <Suspense fallback={null}>
        <RoomScreen key={room[1]} code={decodeURIComponent(room[1]!)} />
      </Suspense>
    );
  }

  if (!isScreen(path)) return <Home />;
  const Screen = screens[path];
  return (
    <Suspense fallback={null}>
      <Screen key={path} />
    </Suspense>
  );
}
